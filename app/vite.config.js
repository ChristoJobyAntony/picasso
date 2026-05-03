import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
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
