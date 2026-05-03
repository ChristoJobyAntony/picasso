import { Link } from "react-router-dom";
import Button from "@mui/material/Button";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardOutlined";

const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Picasso",
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    description:
        "Neural style transfer web app that restyles your photographs in the brushwork of master painters.",
    url: "https://picasso.example/",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export const Landing = () => {
    return (
        <div className="landing">
            <title>Picasso — Reincarnate art with AI style transfer</title>
            <meta
                name="description"
                content="Upload a photo, pick a master painting, and let Picasso restyle your image in seconds. Free neural style transfer in the browser."
            />
            <link rel="canonical" href="https://picasso.example/" />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <section className="landing__hero container">
                <div className="landing__copy">
                    <p className="eyebrow">Neural style transfer</p>
                    <h1 className="landing__headline">
                        Reincarnate the art of the past
                        <em className="landing__headline-em">
                            {" "}
                            with the AI of today.
                        </em>
                    </h1>
                    <p className="landing__sub">
                        Upload a photograph, choose a master, and Picasso
                        restyles your image in the brushwork of Picasso, Dal&iacute;,
                        and beyond &mdash; in seconds.
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
                            Begin
                        </Button>
                        <span className="landing__hint">
                            Free &middot; No sign up &middot; 10&nbsp;MB max
                        </span>
                    </div>
                </div>
                <figure className="landing__figure">
                    <img
                        src="/art_lover.svg"
                        alt="Illustration of a person admiring a painting in a gallery."
                        width="480"
                        height="480"
                        decoding="async"
                        fetchPriority="high"
                    />
                </figure>
            </section>

            <hr className="rule" />

            <section className="landing__how container">
                <h2 className="landing__how-title">How it works</h2>
                <ol className="landing__steps">
                    <li>
                        <span className="landing__step-num">01</span>
                        <h3>Upload your photo</h3>
                        <p>
                            Any portrait, landscape, or scene. JPEG or PNG, up to
                            10&nbsp;MB.
                        </p>
                    </li>
                    <li>
                        <span className="landing__step-num">02</span>
                        <h3>Pick a master</h3>
                        <p>
                            Choose from a curated set of paintings &mdash; Picasso,
                            Dal&iacute; and more.
                        </p>
                    </li>
                    <li>
                        <span className="landing__step-num">03</span>
                        <h3>Receive your piece</h3>
                        <p>
                            Google&rsquo;s arbitrary stylization model paints your
                            image in seconds.
                        </p>
                    </li>
                </ol>
            </section>
        </div>
    );
};

export default Landing;
