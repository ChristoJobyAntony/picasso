import { useEffect, useRef, useState } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import UploadIcon from "@mui/icons-material/UploadFileOutlined";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import api, { StyleInfo } from "./api";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg"];

interface Props {
    resultUrl: string | undefined;
    setResultUrl: (next: string | undefined) => void;
}

export const Stylize = ({ setResultUrl }: Props) => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [userImageUrl, setUserImageUrl] = useState<string | undefined>();
    const [userImageFile, setUserImageFile] = useState<File | undefined>();
    const [styles, setStyles] = useState<StyleInfo[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        api.getStyles()
            .then(setStyles)
            .catch(() => {
                enqueueSnackbar(
                    "Could not load styles. Refresh to try again.",
                    { variant: "error" }
                );
            });
    }, [enqueueSnackbar]);

    useEffect(() => {
        return () => {
            if (userImageUrl) URL.revokeObjectURL(userImageUrl);
        };
    }, [userImageUrl]);

    const acceptFile = (file: File) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            enqueueSnackbar("Please choose a PNG or JPEG image.");
            return;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            enqueueSnackbar("That image is over 10 MB. Try a smaller one.");
            return;
        }
        if (userImageUrl) URL.revokeObjectURL(userImageUrl);
        setUserImageFile(file);
        setUserImageUrl(URL.createObjectURL(file));
    };

    const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) acceptFile(file);
    };

    const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) acceptFile(file);
    };

    const onPrev = () => setActiveIndex((i) => Math.max(0, i - 1));
    const onNext = () =>
        setActiveIndex((i) => Math.min(styles.length - 1, i + 1));

    const submit = async () => {
        if (!userImageFile) {
            enqueueSnackbar("Choose a photo to begin.");
            return;
        }
        if (styles.length === 0) return;
        setLoading(true);
        try {
            const blob = await api.sendFiles(
                userImageFile,
                styles[activeIndex].id
            );
            setResultUrl(URL.createObjectURL(blob));
            navigate("/result");
        } catch {
            enqueueSnackbar("Stylization failed — try a different image.", {
                variant: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    const activeStyle = styles[activeIndex];
    const canSubmit = !loading && !!userImageFile && styles.length > 0;

    return (
        <section className="stylize container">
            <title>Run the model &mdash; Picasso</title>
            <meta
                name="description"
                content="Provide a content image and a style image to run feed-forward neural style transfer."
            />
            <meta name="robots" content="noindex" />
            <header className="stylize__head">
                <p className="eyebrow">Inputs</p>
                <h1 className="stylize__title">Run the model</h1>
                <p className="stylize__lede">
                    Pick a content image (your photo) and a style image (a
                    painting). The network resizes inputs to 512&nbsp;px on the
                    long edge before a single forward pass.
                </p>
            </header>

            <div className="stylize__grid">
                <div className="stylize__col">
                    <h2 className="stylize__col-title">Content image</h2>
                    <label
                        className={`dropzone${userImageUrl ? " dropzone--filled" : ""}${dragOver ? " dropzone--drag" : ""}`}
                        onDrop={onDrop}
                        onDragOver={(e) => {
                            e.preventDefault();
                            if (!dragOver) setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                    >
                        {userImageUrl ? (
                            <img
                                src={userImageUrl}
                                alt="Your selected photo"
                                className="dropzone__img"
                            />
                        ) : (
                            <div className="dropzone__empty">
                                <UploadIcon fontSize="large" />
                                <span className="dropzone__hint">
                                    Drop a photo, or click to upload
                                </span>
                                <span className="dropzone__sub">
                                    PNG or JPEG &middot; up to 10&nbsp;MB
                                </span>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg"
                            hidden
                            onChange={onFileSelected}
                        />
                    </label>
                    {userImageUrl && (
                        <button
                            type="button"
                            className="link-btn"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Replace photo
                        </button>
                    )}
                </div>

                <div className="stylize__col">
                    <h2 className="stylize__col-title">Style image</h2>
                    <div className="picker">
                        <div className="picker__frame">
                            {activeStyle ? (
                                <img
                                    src={api.getStyleImagePath(activeStyle.id)}
                                    alt={activeStyle.title}
                                    className="picker__img"
                                    loading="lazy"
                                    decoding="async"
                                />
                            ) : (
                                <div
                                    className="picker__placeholder"
                                    aria-hidden="true"
                                />
                            )}
                        </div>
                        <div className="picker__controls">
                            <IconButton
                                onClick={onPrev}
                                disabled={activeIndex === 0}
                                size="medium"
                                aria-label="Previous style image"
                            >
                                <NavigateBeforeIcon />
                            </IconButton>
                            <div className="picker__meta">
                                <p className="picker__title">
                                    {activeStyle?.title ?? "—"}
                                </p>
                                <p className="picker__desc">
                                    {activeStyle?.description ?? ""}
                                </p>
                                <p className="picker__count">
                                    {styles.length > 0
                                        ? `${activeIndex + 1} / ${styles.length}`
                                        : ""}
                                </p>
                            </div>
                            <IconButton
                                onClick={onNext}
                                disabled={activeIndex >= styles.length - 1}
                                size="medium"
                                aria-label="Next style image"
                            >
                                <NavigateNextIcon />
                            </IconButton>
                        </div>
                    </div>
                </div>
            </div>

            <div className="stylize__action">
                <Button
                    onClick={submit}
                    disabled={!canSubmit}
                    variant="contained"
                    color="primary"
                    size="large"
                >
                    {loading ? (
                        <CircularProgress
                            size={20}
                            sx={{ color: "var(--paper)" }}
                        />
                    ) : (
                        "Run inference"
                    )}
                </Button>
            </div>
        </section>
    );
};

export default Stylize;
