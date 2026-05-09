import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-backend-webgpu";
import "@tensorflow/tfjs-backend-cpu";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import "@tensorflow/tfjs-backend-wasm";
import { loadGraphModel, GraphModel } from "@tensorflow/tfjs-converter";

// Bundle the WASM binaries locally via Vite ?url so the OCI box can stay a
// pure static server with no CDN runtime dependency.
import wasmUrl from "@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm?url";
import wasmSimdUrl from "@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-simd.wasm?url";
import wasmThreadedSimdUrl from "@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-threaded-simd.wasm?url";

import { INFERENCE_MAX_DIMENSION } from "../config";

setWasmPaths({
    "tfjs-backend-wasm.wasm": wasmUrl,
    "tfjs-backend-wasm-simd.wasm": wasmSimdUrl,
    "tfjs-backend-wasm-threaded-simd.wasm": wasmThreadedSimdUrl,
});

// Served from app/public/model — Vite copies it under the build base. The
// BASE_URL prefix is required so the same fetch works under "/" in dev and
// "/picasso/" on GitHub Pages.
const MODEL_URL = `${import.meta.env.BASE_URL}model/model.json`;

// Fixed size the style image is resized to (square) before being fed to the
// style-prediction subnetwork. The model was trained at 256x256, and only a
// 100-d style embedding flows out of it — feeding a larger style image gains
// nothing and explodes Inception V3's mid-layer activations past WebGL's
// 8192-px texture limit on most mobile/integrated GPUs.
const STYLE_IMAGE_SIZE = 256;

// First conv of the transfer network is 9x9 with 3 input channels. TF.js's
// WebGL backend turns this into an im2col matmul whose im2col matrix has
// shape [H*W, 9*9*3] = [H*W, 243]. Packed RGBA, the texture is roughly
// sqrt(H*W*243/4) on a side. The largest content long-edge that keeps that
// texture under MAX_TEXTURE_SIZE is the WebGL safety ceiling.
const FIRST_CONV_PATCH_SIZE = 9 * 9 * 3;
const WEBGL_SAFETY_FRACTION = 0.9;

let modelPromise: Promise<GraphModel> | null = null;
let backendReady: Promise<string> | null = null;

export type ModelBackend = "webgpu" | "webgl" | "wasm" | "cpu";
export type BackendChoice = "auto" | ModelBackend;

const BACKEND_STORAGE_KEY = "picasso:backend";
const RESOLUTION_STORAGE_KEY = "picasso:resolution";

// Slider bounds. The build-time INFERENCE_MAX_DIMENSION is the upper bound;
// 256 is the model's training resolution and a sane lower bound. Step keeps
// the slider on tidy multiples without making it too coarse.
export const RESOLUTION_MIN = 256;
export const RESOLUTION_MAX = INFERENCE_MAX_DIMENSION;
export const RESOLUTION_STEP = 64;

export interface ModelLoadProgress {
    fraction: number;
}

export interface BackendOption {
    name: BackendChoice;
    available: boolean;
    note?: string;
}

function getWebGLMaxTextureSize(): number {
    try {
        const canvas = document.createElement("canvas");
        const gl = (canvas.getContext("webgl2") ||
            canvas.getContext("webgl")) as WebGLRenderingContext | null;
        if (!gl) return 0;
        return gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    } catch {
        return 0;
    }
}

function safeWebGLContentSize(maxTextureSize: number): number {
    if (maxTextureSize <= 0) return 0;
    const maxValues =
        maxTextureSize * maxTextureSize * 4 * WEBGL_SAFETY_FRACTION;
    const maxPixels = maxValues / FIRST_CONV_PATCH_SIZE;
    return Math.floor(Math.sqrt(maxPixels));
}

async function pickBackend(): Promise<string> {
    // 1. WebGPU — Chrome 113+, Safari 18+, Edge. Larger texture limits and
    //    typically faster than WebGL on the same hardware.
    if (typeof navigator !== "undefined" && "gpu" in navigator) {
        try {
            await tf.setBackend("webgpu");
            await tf.ready();
            return "webgpu";
        } catch (err) {
            console.warn("WebGPU init failed, trying WebGL", err);
        }
    }

    // 2. WebGL — fastest fallback, but capped by GPU MAX_TEXTURE_SIZE.
    //    Skip if our configured max content size would exceed the safe
    //    ceiling for this device's GPU.
    const maxTex = getWebGLMaxTextureSize();
    const safeSize = safeWebGLContentSize(maxTex);
    if (maxTex > 0 && safeSize >= INFERENCE_MAX_DIMENSION) {
        try {
            await tf.setBackend("webgl");
            await tf.ready();
            return "webgl";
        } catch (err) {
            console.warn("WebGL init failed, trying WASM", err);
        }
    } else if (maxTex > 0) {
        console.warn(
            `Skipping WebGL: GPU MAX_TEXTURE_SIZE=${maxTex} caps content at ` +
                `~${safeSize} px, but PICASSO_INFERENCE_MAX_DIMENSION=${INFERENCE_MAX_DIMENSION}. ` +
                `Falling back to WASM (slower but no texture limit).`
        );
    }

    // 3. WASM — XNNPACK-backed, no GPU texture limits. ~3x slower than WebGL.
    try {
        await tf.setBackend("wasm");
        await tf.ready();
        return "wasm";
    } catch (err) {
        console.warn("WASM init failed, falling back to CPU", err);
    }

    // 4. Plain CPU — last resort, very slow on conv layers.
    await tf.setBackend("cpu");
    await tf.ready();
    return "cpu";
}

function readStoredChoice(): BackendChoice {
    if (typeof localStorage === "undefined") return "auto";
    const raw = localStorage.getItem(BACKEND_STORAGE_KEY);
    if (raw === "auto" || raw === "webgpu" || raw === "webgl" || raw === "wasm" || raw === "cpu") {
        return raw;
    }
    return "auto";
}

function writeStoredChoice(choice: BackendChoice): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(BACKEND_STORAGE_KEY, choice);
}

function clampResolution(value: number): number {
    if (!Number.isFinite(value)) return RESOLUTION_MAX;
    const rounded = Math.round(value);
    if (rounded < RESOLUTION_MIN) return RESOLUTION_MIN;
    if (rounded > RESOLUTION_MAX) return RESOLUTION_MAX;
    return rounded;
}

export function getStoredResolution(): number {
    if (typeof localStorage === "undefined") return RESOLUTION_MAX;
    const raw = localStorage.getItem(RESOLUTION_STORAGE_KEY);
    if (raw === null) return RESOLUTION_MAX;
    return clampResolution(Number(raw));
}

export function setStoredResolution(value: number): number {
    const clamped = clampResolution(value);
    if (typeof localStorage !== "undefined") {
        localStorage.setItem(RESOLUTION_STORAGE_KEY, String(clamped));
    }
    return clamped;
}

async function activateExplicit(name: ModelBackend): Promise<string> {
    await tf.setBackend(name);
    await tf.ready();
    return name;
}

async function activate(choice: BackendChoice): Promise<string> {
    if (choice === "auto") return pickBackend();
    try {
        return await activateExplicit(choice);
    } catch (err) {
        console.warn(
            `Backend "${choice}" failed to initialize; falling back to auto.`,
            err
        );
        return pickBackend();
    }
}

async function ensureBackend(): Promise<string> {
    if (!backendReady) backendReady = activate(readStoredChoice());
    return backendReady;
}

export async function getActiveBackend(): Promise<string> {
    return ensureBackend();
}

export function getStoredBackendChoice(): BackendChoice {
    return readStoredChoice();
}

export function getAvailableBackends(): BackendOption[] {
    const webgpuAvailable =
        typeof navigator !== "undefined" && "gpu" in navigator;
    const maxTex = getWebGLMaxTextureSize();
    const webglAvailable = maxTex > 0;
    const safeSize = safeWebGLContentSize(maxTex);
    const webglNote =
        webglAvailable && safeSize < INFERENCE_MAX_DIMENSION
            ? `safe to ~${safeSize} px on this GPU`
            : undefined;
    return [
        { name: "auto", available: true },
        {
            name: "webgpu",
            available: webgpuAvailable,
            note: webgpuAvailable ? undefined : "not supported by this browser",
        },
        {
            name: "webgl",
            available: webglAvailable,
            note: webglNote,
        },
        { name: "wasm", available: true, note: "no GPU limit, slower" },
        { name: "cpu", available: true, note: "fallback only, very slow" },
    ];
}

/**
 * Apply a user-picked backend choice. Disposes the current GraphModel,
 * resets the singleton state, persists the choice, and lets the next
 * loadModel() call re-load weights into the new backend.
 */
export async function applyBackendChoice(
    choice: BackendChoice
): Promise<string> {
    writeStoredChoice(choice);
    if (modelPromise) {
        try {
            const model = await modelPromise;
            model.dispose();
        } catch {
            // ignore disposal errors
        }
        modelPromise = null;
    }
    backendReady = activate(choice);
    return backendReady;
}

export async function loadModel(
    onProgress?: (p: ModelLoadProgress) => void
): Promise<GraphModel> {
    await ensureBackend();
    if (!modelPromise) {
        modelPromise = loadGraphModel(MODEL_URL, {
            onProgress: (fraction) => onProgress?.({ fraction }),
        }).catch((err) => {
            modelPromise = null;
            throw err;
        });
    }
    return modelPromise;
}

function fitToMaxDim(
    width: number,
    height: number,
    maxDim: number
): [number, number] {
    const longEdge = Math.max(width, height);
    if (longEdge <= maxDim) return [height, width];
    const scale = maxDim / longEdge;
    return [Math.round(height * scale), Math.round(width * scale)];
}

function imageToTensor(
    img: HTMLImageElement,
    targetSize: [number, number]
): tf.Tensor4D {
    return tf.tidy(() => {
        const raw = tf.browser.fromPixels(img);
        const float = tf.cast(raw, "float32");
        const normalized = tf.div(float, 255);
        const resized = tf.image.resizeBilinear(
            normalized as tf.Tensor3D,
            targetSize
        );
        return tf.expandDims(resized, 0) as tf.Tensor4D;
    });
}

function contentTargetSize(
    img: HTMLImageElement,
    maxDim: number
): [number, number] {
    const [h, w] = fitToMaxDim(img.naturalWidth, img.naturalHeight, maxDim);
    return [h, w];
}

const STYLE_TARGET_SIZE: [number, number] = [
    STYLE_IMAGE_SIZE,
    STYLE_IMAGE_SIZE,
];

export async function stylize(
    contentImg: HTMLImageElement,
    styleImg: HTMLImageElement,
    contentMaxDim: number = INFERENCE_MAX_DIMENSION
): Promise<HTMLCanvasElement> {
    const model = await loadModel();
    const effectiveMax = clampResolution(contentMaxDim);

    // Tidy disposes intermediate tensors; the squeezed result escapes via the
    // returned reference and is disposed manually after we draw it.
    const result = tf.tidy(() => {
        const content = imageToTensor(
            contentImg,
            contentTargetSize(contentImg, effectiveMax)
        );
        const style = imageToTensor(styleImg, STYLE_TARGET_SIZE);
        // Input names come from the SavedModel SignatureDef. Verified at
        // conversion time by inspecting model.json.signature.inputs.
        const output = model.execute({
            "placeholder:0": content,
            "placeholder_1:0": style,
        }) as tf.Tensor4D;
        return tf.squeeze(output, [0]) as tf.Tensor3D;
    });

    const canvas = document.createElement("canvas");
    canvas.height = result.shape[0];
    canvas.width = result.shape[1];
    await tf.browser.toPixels(result, canvas);
    result.dispose();
    return canvas;
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () =>
            reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

export async function fileToImage(file: File): Promise<HTMLImageElement> {
    const url = URL.createObjectURL(file);
    try {
        return await loadHtmlImage(url);
    } finally {
        URL.revokeObjectURL(url);
    }
}

export function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string = "image/png"
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) =>
                blob
                    ? resolve(blob)
                    : reject(new Error("canvas.toBlob returned null")),
            type
        );
    });
}
