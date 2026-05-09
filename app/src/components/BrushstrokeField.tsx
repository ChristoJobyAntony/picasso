import { useEffect, useRef } from "react";
import {
    Color,
    DynamicDrawUsage,
    InstancedBufferAttribute,
    InstancedBufferGeometry,
    InstancedMesh,
    Matrix4,
    OrthographicCamera,
    PlaneGeometry,
    Scene,
    ShaderMaterial,
    WebGLRenderer,
} from "three";

const PARTICLE_COUNT = 6400;
const SAFFRON = "#c2410c";

const VERT = /* glsl */ `
attribute float a_age;
attribute float a_seed;
varying vec2 v_uv;
varying float v_age;
varying float v_seed;
void main() {
    v_uv = uv;
    v_age = a_age;
    v_seed = a_seed;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform vec3 u_color;
varying vec2 v_uv;
varying float v_age;
varying float v_seed;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 c = v_uv - 0.5;
    // Transverse: hard center, feathered edge — soft brush.
    float across = smoothstep(0.5, 0.05, abs(c.y));
    // Longitudinal: feathered tips.
    float along = smoothstep(0.5, 0.30, abs(c.x));
    float grain = 0.78 + 0.22 * hash(v_uv * 7.0 + vec2(v_seed * 91.0));
    float streaks = 0.85 + 0.15 * sin(v_uv.x * 18.0 + v_seed * 30.0);
    float life = sin(clamp(v_age, 0.0, 1.0) * 3.14159265);

    float alpha = across * along * grain * streaks * life * 0.85;
    if (alpha < 0.012) discard;
    gl_FragColor = vec4(u_color, alpha);
}
`;

interface Particle {
    x: number;
    y: number;
    age: number;
    lifetime: number;
    length: number;
    width: number;
    seed: number;
    speed: number;
}

// Three-octave divergence-free flow. Each octave is the curl of a
// sin·cos potential; summing curls preserves zero divergence. Frequencies
// (1.4, 2.7, 4.97) are mutually irrational so vortices don't tile onto a
// rectangular lattice — gives organic, non-repeating swirls.
function flow(x: number, y: number, t: number): [number, number] {
    let vx = 0;
    let vy = 0;

    // Octave 1 — large vortices (dominant).
    {
        const a = 1.4;
        const sx = a * x + 0.3 * t;
        const sy = a * y - 0.2 * t;
        vx += -a * Math.sin(sx) * Math.sin(sy);
        vy += -a * Math.cos(sx) * Math.cos(sy);
    }
    // Octave 2 — medium vortices, irrational ratio to octave 1.
    {
        const a = 2.7;
        const sx = a * x - 0.4 * t;
        const sy = a * y + 0.5 * t;
        vx += -0.5 * a * Math.sin(sx) * Math.sin(sy);
        vy += -0.5 * a * Math.cos(sx) * Math.cos(sy);
    }
    // Octave 3 — fine turbulence; breaks up saddle-point voids.
    {
        const a = 4.97;
        const sx = a * x + 0.2 * t;
        const sy = a * y - 0.3 * t;
        vx += -0.25 * a * Math.sin(sx) * Math.sin(sy);
        vy += -0.25 * a * Math.cos(sx) * Math.cos(sy);
    }

    return [vx, vy];
}

// Base length scale and ± randomization band; multiply to shift the whole
// distribution while keeping the same proportional variance.
const LENGTH_VARIANCE_LO = 0.4;
const LENGTH_VARIANCE_HI = 1.6;

function spawn(
    p: Particle,
    halfW: number,
    halfH: number,
    strokeLength: number
): void {
    p.x = (Math.random() * 2 - 1) * halfW * 1.05;
    p.y = (Math.random() * 2 - 1) * halfH * 1.05;
    p.age = 0;
    p.lifetime = 1.8 + Math.random() * 2.4;
    p.length =
        strokeLength *
        (LENGTH_VARIANCE_LO +
            Math.random() * (LENGTH_VARIANCE_HI - LENGTH_VARIANCE_LO));
    p.width = 0.008 + Math.random() * 0.014;
    p.seed = Math.random();
    p.speed = 0.04 + Math.random() * 0.07;
}

interface BrushstrokeFieldProps {
    /**
     * Base stroke length in viewport units (vertical extent = 2). Each stroke
     * is randomized to 0.4×–1.6× this value. Default 0.15 (≈ current range).
     */
    strokeLength?: number;
}

export default function BrushstrokeField({
    strokeLength = 0.05,
}: BrushstrokeFieldProps = {}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    // Routed through a ref so live prop changes apply to new spawns without
    // tearing down and rebuilding the WebGL context.
    const strokeLengthRef = useRef(strokeLength);
    strokeLengthRef.current = strokeLength;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        let renderer: WebGLRenderer;
        try {
            renderer = new WebGLRenderer({ alpha: true, antialias: true });
        } catch (err) {
            console.error("BrushstrokeField: WebGL init failed", err);
            return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        const canvas = renderer.domElement;
        canvas.style.display = "block";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        container.appendChild(canvas);

        const scene = new Scene();
        const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        // InstancedBufferGeometry (vs PlaneGeometry) makes the
        // InstancedBufferAttribute association explicit and rules out any
        // ambiguity in attribute divisor wiring.
        const base = new PlaneGeometry(1, 1);
        const geometry = new InstancedBufferGeometry();
        geometry.index = base.index;
        geometry.attributes.position = base.attributes.position;
        geometry.attributes.uv = base.attributes.uv;
        geometry.attributes.normal = base.attributes.normal;

        const material = new ShaderMaterial({
            vertexShader: VERT,
            fragmentShader: FRAG,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            uniforms: {
                u_color: { value: new Color(SAFFRON) },
            },
        });

        const mesh = new InstancedMesh(geometry, material, PARTICLE_COUNT);
        mesh.frustumCulled = false;
        const ageAttr = new InstancedBufferAttribute(
            new Float32Array(PARTICLE_COUNT),
            1
        );
        const seedAttr = new InstancedBufferAttribute(
            new Float32Array(PARTICLE_COUNT),
            1
        );
        ageAttr.setUsage(DynamicDrawUsage);
        geometry.setAttribute("a_age", ageAttr);
        geometry.setAttribute("a_seed", seedAttr);
        scene.add(mesh);

        let halfW = 1;
        let halfH = 1;

        const particles: Particle[] = Array.from(
            { length: PARTICLE_COUNT },
            () => ({
                x: 0,
                y: 0,
                age: 0,
                lifetime: 0,
                length: 0,
                width: 0,
                seed: 0,
                speed: 0,
            })
        );

        const tmpMat = new Matrix4();
        const tmpRot = new Matrix4();
        const tmpScl = new Matrix4();
        const tmpTrn = new Matrix4();

        const tick = (dtSec: number, tSec: number) => {
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.age += dtSec / p.lifetime;
                if (p.age >= 1) spawn(p, halfW, halfH, strokeLengthRef.current);

                const [vx, vy] = flow(p.x * 1.6, p.y * 1.6, tSec * 0.22);
                p.x += vx * p.speed * dtSec * 1.6;
                p.y += vy * p.speed * dtSec * 1.6;

                // Brownian diffusion. Pure curl flow leaves saddle-point
                // regions sparse because particles speed through them
                // (density ∝ 1/|v|); a small random walk homogenizes coverage.
                p.x += (Math.random() - 0.5) * 0.25 * dtSec;
                p.y += (Math.random() - 0.5) * 0.25 * dtSec;

                if (
                    Math.abs(p.x) > halfW * 1.3 ||
                    Math.abs(p.y) > halfH * 1.3
                ) {
                    spawn(p, halfW, halfH, strokeLengthRef.current);
                }

                const angle = Math.atan2(vy, vx);
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                tmpRot.set(
                    cos, -sin, 0, 0,
                    sin,  cos, 0, 0,
                      0,    0, 1, 0,
                      0,    0, 0, 1
                );
                tmpScl.makeScale(p.length, p.width, 1);
                tmpTrn.makeTranslation(p.x, p.y, 0);
                tmpMat.multiplyMatrices(tmpTrn, tmpRot).multiply(tmpScl);
                mesh.setMatrixAt(i, tmpMat);

                ageAttr.array[i] = p.age;
                seedAttr.array[i] = p.seed;
            }
            mesh.instanceMatrix.needsUpdate = true;
            ageAttr.needsUpdate = true;
            seedAttr.needsUpdate = true;
        };

        const resize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w === 0 || h === 0) return;
            renderer.setSize(w, h, false);
            const aspect = w / h;
            halfW = aspect;
            halfH = 1;
            camera.left = -halfW;
            camera.right = halfW;
            camera.top = halfH;
            camera.bottom = -halfH;
            camera.updateProjectionMatrix();

            // setSize cleared the framebuffer; pull any particle that's now
            // well outside the new frustum back in, then render synchronously
            // so the canvas isn't blank between the resize and the next rAF.
            for (const p of particles) {
                if (
                    Math.abs(p.x) > halfW * 1.3 ||
                    Math.abs(p.y) > halfH * 1.3
                ) {
                    spawn(p, halfW, halfH, strokeLengthRef.current);
                    p.age = Math.random();
                }
            }
            tick(0, performance.now() / 1000);
            renderer.render(scene, camera);
        };

        // Initial spawn before first resize so the immediate render shows
        // particles rather than identity-matrix instances stacked at origin.
        for (const p of particles) {
            spawn(p, halfW, halfH, strokeLengthRef.current);
            p.age = Math.random();
        }
        resize();

        const ro = new ResizeObserver(resize);
        ro.observe(container);

        let onscreen = true;
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) onscreen = e.isIntersecting;
            },
            { threshold: 0 }
        );
        io.observe(container);

        const isVisible = () =>
            onscreen && document.visibilityState === "visible";

        let raf = 0;
        let last = performance.now();
        const loop = (now: number) => {
            const dt = Math.min((now - last) / 1000, 1 / 30);
            last = now;
            if (isVisible()) {
                tick(dt, now / 1000);
                renderer.render(scene, camera);
            }
            raf = requestAnimationFrame(loop);
        };

        // WebGL context loss can fire on aggressive resize / GPU pressure.
        // preventDefault asks Chrome to attempt restoration; three.js
        // re-uploads buffers/textures automatically on the restore event.
        const onContextLost = (e: Event) => {
            e.preventDefault();
            cancelAnimationFrame(raf);
            raf = 0;
        };
        const onContextRestored = () => {
            if (raf === 0 && !reduceMotion) {
                last = performance.now();
                resize();
                raf = requestAnimationFrame(loop);
            }
        };
        canvas.addEventListener("webglcontextlost", onContextLost);
        canvas.addEventListener("webglcontextrestored", onContextRestored);

        if (reduceMotion) {
            // resize() already rendered once; nothing else to do.
        } else {
            raf = requestAnimationFrame(loop);
        }

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            io.disconnect();
            canvas.removeEventListener("webglcontextlost", onContextLost);
            canvas.removeEventListener("webglcontextrestored", onContextRestored);
            base.dispose();
            geometry.dispose();
            material.dispose();
            renderer.dispose();
            if (canvas.parentElement === container) {
                container.removeChild(canvas);
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="brushstroke-field"
            aria-hidden="true"
        />
    );
}
