import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@mui/material/Button";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardOutlined";
import { INFERENCE_MAX_DIMENSION } from "../config";

// Decorative WebGL artifact: kept out of the main bundle, only loaded on
// viewports wide enough to show it.
const BrushstrokeField = lazy(() => import("./BrushstrokeField"));

const useWideViewport = (): boolean => {
    const [wide, setWide] = useState<boolean>(() =>
        typeof window !== "undefined"
            ? window.matchMedia("(min-width: 900px)").matches
            : false
    );
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 900px)");
        const handler = (e: MediaQueryListEvent) => setWide(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);
    return wide;
};

const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: "Picasso",
    description:
        "An interactive demo of Google Magenta's pretrained arbitrary image stylization network (Ghiasi et al., 2017).",
    programmingLanguage: ["TypeScript"],
    codeRepository: "https://github.com/zahransajid/picasso",
    url: "https://picasso.example/",
};

export const Landing = () => {
    const showArtifact = useWideViewport();
    return (
        <div className="landing">
            <title>Picasso &mdash; a neural style transfer demo</title>
            <meta
                name="description"
                content="An interactive demo of Google Magenta's pretrained arbitrary image stylization network (Ghiasi et al., 2017). Feed-forward neural style transfer in the browser."
            />
            <link rel="canonical" href="https://picasso.example/" />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <section className="landing__hero container">
                <div className="landing__copy">
                    <p className="eyebrow">A demo project &middot; 2017 model</p>
                    <h1 className="landing__headline">
                        Arbitrary neural style transfer,
                        <em className="landing__headline-em">
                            {" "}
                            in your browser.
                        </em>
                    </h1>
                    <p className="landing__sub">
                        Picasso wraps Google Magenta&rsquo;s pretrained
                        arbitrary&#8209;stylization network behind a small web UI.
                        Give it a content image and a style image and it returns a
                        single feed&#8209;forward composite at {INFERENCE_MAX_DIMENSION}
                        &nbsp;px. No diffusion, no semantic understanding &mdash;
                        just classical neural style transfer from 2017, running
                        entirely in your browser via TensorFlow.js.
                    </p>
                    <div className="landing__cta">
                        <Button
                            component={Link}
                            to="/stylize"
                            variant="contained"
                            color="primary"
                            size="large"
                            endIcon={<ArrowForwardIcon />}
                        >
                            Run the model
                        </Button>
                        <span className="landing__hint">
                            Free &middot; runs in&#8209;browser &middot; no
                            uploads
                        </span>
                    </div>
                </div>
                {showArtifact && (
                    <div className="landing__artifact" aria-hidden="true">
                        <Suspense fallback={null}>
                            <BrushstrokeField />
                        </Suspense>
                    </div>
                )}
            </section>

            <hr className="rule" />

            <section className="landing__how container">
                <h2 className="landing__how-title">About the model</h2>
                <p className="landing__how-lede">
                    The interesting part lives in the model, not in this UI. It is
                    described in the{" "}
                    <a
                        className="text-link"
                        href="https://www.tensorflow.org/tutorials/generative/style_transfer"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        TensorFlow neural style transfer tutorial
                    </a>{" "}
                    and the{" "}
                    <a
                        className="text-link"
                        href="https://arxiv.org/abs/1705.06830"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Ghiasi et&nbsp;al. (2017)
                    </a>{" "}
                    paper.
                </p>

                <ol className="landing__steps">
                    <li>
                        <span className="landing__step-num">01</span>
                        <h3>What it does</h3>
                        <p>
                            A style&#8209;prediction network extracts a
                            100&#8209;dimensional embedding from the style image,
                            and a transfer network composes it with the content
                            image in a single forward pass. Sub&#8209;second
                            inference on CPU.
                        </p>
                    </li>
                    <li>
                        <span className="landing__step-num">02</span>
                        <h3>What it does not</h3>
                        <p>
                            It transfers low&#8209; and mid&#8209;level visual
                            statistics &mdash; brushwork, palette, edge texture
                            &mdash; not composition, semantics, or identity.
                            Don&rsquo;t expect a Picasso painting; expect a
                            Picasso&#8209;textured version of your photo.
                        </p>
                    </li>
                    <li>
                        <span className="landing__step-num">03</span>
                        <h3>Resolution &amp; artifacts</h3>
                        <p>
                            Content is resized to {INFERENCE_MAX_DIMENSION}
                            &nbsp;px on the long edge; the style image is
                            squashed to 256&times;256 (the network&rsquo;s
                            training resolution). Expect softening of fine
                            detail, occasional color drift, and texture leaking
                            into flat regions. It&rsquo;s a 2017&#8209;era
                            model that predates diffusion.
                        </p>
                    </li>
                </ol>
            </section>

            <hr className="rule" />

            <section className="landing__credits container">
                <h2 className="landing__how-title">Credits &amp; references</h2>
                <ul className="landing__credit-list">
                    <li>
                        <strong>Paper:</strong> Ghiasi, Lee, Kudlur, Dumoulin
                        &amp; Shlens. &ldquo;Exploring the structure of a
                        real&#8209;time, arbitrary neural artistic stylization
                        network.&rdquo; <em>BMVC</em>, 2017.{" "}
                        <a
                            className="text-link"
                            href="https://arxiv.org/abs/1705.06830"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            arXiv:1705.06830
                        </a>
                    </li>
                    <li>
                        <strong>Pretrained weights:</strong>{" "}
                        <a
                            className="text-link"
                            href="https://www.kaggle.com/models/google/arbitrary-image-stylization-v1"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            google/arbitrary&#8209;image&#8209;stylization&#8209;v1
                        </a>{" "}
                        on Kaggle Models, originally released by the Google
                        Magenta team.
                    </li>
                    <li>
                        <strong>Reference walk&#8209;through:</strong>{" "}
                        <a
                            className="text-link"
                            href="https://www.tensorflow.org/tutorials/generative/style_transfer"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            TensorFlow neural style transfer tutorial
                        </a>
                        .
                    </li>
                    <li>
                        <strong>This UI:</strong> a static React app that runs
                        the model in&#8209;browser via TensorFlow.js. Source on
                        GitHub.
                    </li>
                </ul>
            </section>
        </div>
    );
};

export default Landing;
