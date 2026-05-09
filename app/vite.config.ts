import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Build-time pin of the model's long-edge inference size. Read from
// PICASSO_INFERENCE_MAX_DIMENSION and used by both the in-browser TF.js
// resize step and the displayed copy.
const inferenceMaxDimension =
    Number(process.env.PICASSO_INFERENCE_MAX_DIMENSION) || 512;

// Public path the build is served from. Defaults to "/picasso/" for the
// standard project-pages URL (https://<user>.github.io/picasso/). Override
// with PICASSO_BASE_PATH="/" for a custom domain or a user/org pages repo.
// Must start and end with "/".
const basePath = process.env.PICASSO_BASE_PATH ?? "/picasso/";

export default defineConfig({
    base: basePath,
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
