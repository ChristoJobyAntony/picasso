import { useEffect, useRef, useState } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import UploadIcon from "@mui/icons-material/UploadFileOutlined";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import api, { StyleInfo } from "./api";
import { INFERENCE_MAX_DIMENSION } from "../config";
import {
    BackendChoice,
    BackendOption,
    RESOLUTION_MAX,
    RESOLUTION_MIN,
    RESOLUTION_STEP,
    applyBackendChoice,
    canvasToBlob,
    fileToImage,
    getActiveBackend,
    getAvailableBackends,
    getStoredBackendChoice,
    getStoredResolution,
    loadHtmlImage,
    loadModel,
    setStoredResolution,
    stylize,
} from "../lib/styleTransfer";

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
    const [running, setRunning] = useState(false);
    const [modelProgress, setModelProgress] = useState(0);
    const [modelReady, setModelReady] = useState(false);
    const [activeBackend, setActiveBackend] = useState<string>("");
    const [backendChoice, setBackendChoice] = useState<BackendChoice>(() =>
        getStoredBackendChoice()
    );
    const [backendOptions, setBackendOptions] = useState<BackendOption[]>(
        () => getAvailableBackends()
    );
    const [switchingBackend, setSwitchingBackend] = useState(false);
    const [resolution, setResolution] = useState<number>(() =>
        getStoredResolution()
    );
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

    // Warm-load the TF.js model in the background as soon as the page mounts.
    useEffect(() => {
        let cancelled = false;
        getActiveBackend().then((b) => {
            if (!cancelled) setActiveBackend(b);
        });
        loadModel((p) => {
            if (!cancelled) setModelProgress(p.fraction);
        })
            .then(() => {
                if (!cancelled) {
                    setModelProgress(1);
                    setModelReady(true);
                }
            })
            .catch((err) => {
                console.error("Failed to load model", err);
                if (!cancelled)
                    enqueueSnackbar(
                        "Could not load the model. Try refreshing or a different browser.",
                        { variant: "error" }
                    );
            });
        return () => {
            cancelled = true;
        };
    }, [enqueueSnackbar]);

    const onBackendChange = async (next: BackendChoice) => {
        if (next === backendChoice || switchingBackend) return;
        setBackendChoice(next);
        setSwitchingBackend(true);
        setModelReady(false);
        setModelProgress(0);
        try {
            const active = await applyBackendChoice(next);
            setActiveBackend(active);
            await loadModel((p) => setModelProgress(p.fraction));
            setModelProgress(1);
            setModelReady(true);
        } catch (err) {
            console.error("Backend switch failed", err);
            enqueueSnackbar("Could not switch backend.", { variant: "error" });
        } finally {
            setSwitchingBackend(false);
        }
    };

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
            enqueueSnackbar("That image is over 10 MB. Try a smaller one.");
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
        if (!userImageFile || styles.length === 0) {
            if (!userImageFile) enqueueSnackbar("Choose a photo to begin.");
            return;
        }
        setRunning(true);
        try {
            const [contentImg, styleImg] = await Promise.all([
                fileToImage(userImageFile),
                loadHtmlImage(api.getStyleImagePath(styles[activeIndex])),
            ]);
            const canvas = await stylize(contentImg, styleImg, resolution);
            const blob = await canvasToBlob(canvas);
            setResultUrl(URL.createObjectURL(blob));
            navigate("/result");
        } catch (err) {
            console.error("Stylization failed", err);
            enqueueSnackbar("Stylization failed — try a different image.", {
                variant: "error",
            });
        } finally {
            setRunning(false);
        }
    };

    const activeStyle = styles[activeIndex];
    const canSubmit =
        !running && modelReady && !!userImageFile && styles.length > 0;

    return (
        <section className="stylize container">
            <title>Run the model &mdash; Picasso</title>
            <meta
                name="description"
                content="Provide a content image and a style image to run feed-forward neural style transfer in your browser."
            />
            <meta name="robots" content="noindex" />
            <header className="stylize__head">
                <p className="eyebrow">Inputs</p>
                <h1 className="stylize__title">Run the model</h1>
                <p className="stylize__lede">
                    Pick a content image (your photo) and a style image (a
                    painting). Inference runs in your browser via TensorFlow.js.
                    The content image is resized to {resolution}&nbsp;px on the
                    long edge (this build caps at {INFERENCE_MAX_DIMENSION}
                    &nbsp;px); the style image is squashed to 256&times;256
                    (the network&rsquo;s training resolution).
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
                                    src={api.getStyleImagePath(activeStyle)}
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
                    {running ? (
                        <CircularProgress
                            size={20}
                            sx={{ color: "var(--paper)" }}
                        />
                    ) : (
                        "Run inference"
                    )}
                </Button>
                {!modelReady && (
                    <div
                        className="model-status"
                        aria-live="polite"
                        aria-busy="true"
                    >
                        <LinearProgress
                            variant="determinate"
                            value={modelProgress * 100}
                            sx={{
                                width: 240,
                                backgroundColor: "var(--rule)",
                                "& .MuiLinearProgress-bar": {
                                    backgroundColor: "var(--ink)",
                                },
                            }}
                        />
                        <span className="model-status__text">
                            {switchingBackend
                                ? "Switching backend"
                                : "Loading model"}
                            &hellip; {Math.round(modelProgress * 100)}%
                        </span>
                    </div>
                )}
                <div className="resolution-picker">
                    <label
                        className="resolution-picker__label"
                        htmlFor="resolution-slider"
                    >
                        <span>resolution</span>
                        <span className="resolution-picker__value">
                            {resolution} px
                        </span>
                    </label>
                    <input
                        id="resolution-slider"
                        type="range"
                        className="resolution-picker__input"
                        min={RESOLUTION_MIN}
                        max={RESOLUTION_MAX}
                        step={RESOLUTION_STEP}
                        value={resolution}
                        onChange={(e) => {
                            const next = setStoredResolution(
                                Number(e.target.value)
                            );
                            setResolution(next);
                        }}
                        disabled={running || switchingBackend}
                    />
                    <div className="resolution-picker__bounds">
                        <span>{RESOLUTION_MIN}</span>
                        <span>build cap: {RESOLUTION_MAX}</span>
                    </div>
                </div>
                <div className="backend-picker">
                    <label
                        className="backend-picker__label"
                        htmlFor="backend-select"
                    >
                        backend:
                    </label>
                    <select
                        id="backend-select"
                        className="backend-picker__select"
                        value={backendChoice}
                        onChange={(e) =>
                            onBackendChange(e.target.value as BackendChoice)
                        }
                        disabled={switchingBackend}
                    >
                        {backendOptions.map((opt) => {
                            const showActive =
                                opt.name === "auto" &&
                                activeBackend &&
                                activeBackend !== "auto";
                            const label =
                                opt.name +
                                (showActive ? ` (${activeBackend})` : "") +
                                (opt.note ? ` — ${opt.note}` : "");
                            return (
                                <option
                                    key={opt.name}
                                    value={opt.name}
                                    disabled={!opt.available}
                                >
                                    {label}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>
        </section>
    );
};

export default Stylize;
