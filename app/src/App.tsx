import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import theme from "./theme";
import { NavBar } from "./components/NavBar";
import Landing from "./components/Landing";

const Stylize = lazy(() => import("./components/Stylize"));
const Result = lazy(() => import("./components/Result"));

const RouteFallback = () => (
    <div className="route-fallback" aria-live="polite" aria-busy="true">
        <span className="route-fallback__dot" />
        <span className="route-fallback__dot" />
        <span className="route-fallback__dot" />
    </div>
);

const App = () => {
    const [resultUrl, setResultUrl] = useState<string | undefined>(undefined);

    const updateResult = useCallback((next: string | undefined) => {
        setResultUrl((prev) => {
            if (prev && prev.startsWith("blob:") && prev !== next) {
                URL.revokeObjectURL(prev);
            }
            return next;
        });
    }, []);

    useEffect(() => {
        return () => {
            if (resultUrl && resultUrl.startsWith("blob:")) {
                URL.revokeObjectURL(resultUrl);
            }
        };
    }, [resultUrl]);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <SnackbarProvider
                autoHideDuration={2400}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <BrowserRouter basename={import.meta.env.BASE_URL}>
                    <a className="skip-link" href="#main">
                        Skip to content
                    </a>
                    <NavBar />
                    <main className="page" id="main">
                        <Suspense fallback={<RouteFallback />}>
                            <Routes>
                                <Route index element={<Landing />} />
                                <Route
                                    path="stylize"
                                    element={
                                        <Stylize
                                            resultUrl={resultUrl}
                                            setResultUrl={updateResult}
                                        />
                                    }
                                />
                                <Route
                                    path="result"
                                    element={
                                        <Result
                                            resultUrl={resultUrl}
                                            clearResult={() =>
                                                updateResult(undefined)
                                            }
                                        />
                                    }
                                />
                            </Routes>
                        </Suspense>
                    </main>
                </BrowserRouter>
            </SnackbarProvider>
        </ThemeProvider>
    );
};

export default App;
