import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Build-time pin of the model's long-edge inference size. Read from
// PICASSO_INFERENCE_MAX_DIMENSION and used by both the in-browser TF.js
// resize step and the displayed copy.
const inferenceMaxDimension =
    Number(process.env.PICASSO_INFERENCE_MAX_DIMENSION) || 512;

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
        port: 5173,
        strictPort: true,
    },
});
