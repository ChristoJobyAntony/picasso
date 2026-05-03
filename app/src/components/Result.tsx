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
            <title>Your masterpiece — Picasso</title>
            <meta name="robots" content="noindex" />
            <header className="result__head">
                <p className="eyebrow">Your piece</p>
                <h1 className="result__title">et Voil&agrave;</h1>
            </header>
            <figure className="result__figure">
                <img
                    src={resultUrl}
                    alt="Your stylized image"
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
                    Try another
                </Button>
            </div>
        </section>
    );
};

export default Result;
