import { useEffect } from "react";
import Button from "@mui/material/Button";
import { Link, useNavigate } from "react-router-dom";
import RestartAltIcon from "@mui/icons-material/RestartAltOutlined";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";

interface Props {
    resultUrl: string | undefined;
    clearResult: () => void;
}

export const Result = ({ resultUrl, clearResult }: Props) => {
    const navigate = useNavigate();

    useEffect(() => {
        if (!resultUrl) navigate("/stylize", { replace: true });
    }, [resultUrl, navigate]);

    if (!resultUrl) return null;

    return (
        <section className="result container">
            <title>Output &mdash; Picasso</title>
            <meta name="robots" content="noindex" />
            <header className="result__head">
                <p className="eyebrow">Output</p>
                <h1 className="result__title">Stylized image</h1>
                <p className="result__sub">
                    Single feed&#8209;forward pass at 512&nbsp;px on the long
                    edge.
                </p>
            </header>
            <figure className="result__figure">
                <img
                    src={resultUrl}
                    alt="Stylized output of the model"
                    className="result__img"
                    decoding="async"
                />
            </figure>
            <div className="result__actions">
                <Button
                    component="a"
                    href={resultUrl}
                    download="picasso.png"
                    variant="contained"
                    color="primary"
                    startIcon={<DownloadIcon />}
                    size="large"
                >
                    Download
                </Button>
                <Button
                    component={Link}
                    to="/stylize"
                    onClick={() => clearResult()}
                    variant="outlined"
                    startIcon={<RestartAltIcon />}
                    size="large"
                >
                    Run again
                </Button>
            </div>
        </section>
    );
};

export default Result;
