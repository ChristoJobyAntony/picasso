import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Build-time pin of the model's long-edge inference size. Reads the same env
// var the Python backend uses at runtime, so a single PICASSO_INFERENCE_MAX_DIMENSION
// configures both the actual resize behavior and the displayed copy.
var inferenceMaxDimension = Number(process.env.PICASSO_INFERENCE_MAX_DIMENSION) || 512;
export default defineConfig({
    plugins: [react()],
    define: {
        __INFERENCE_MAX_DIMENSION__: JSON.stringify(inferenceMaxDimension),
    },
    build: {
        outDir: "build",
        sourcemap: false,
        chunkSizeWarningLimit: 800,
    },
    server: {
        port: 3000,
        proxy: {
            "/styles": "http://localhost:8000",
            "/stylize": "http://localhost:8000",
            "/stylizeb64": "http://localhost:8000",
            "/healthz": "http://localhost:8000",
        },
    },
});
