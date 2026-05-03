// Build-time configuration baked into the bundle by Vite.
//
// Source of truth: PICASSO_INFERENCE_MAX_DIMENSION env var, read by both the
// Python backend (runtime, in stylize/utils.py) and Vite (build time, in
// vite.config.ts). Set the same value in both places for the displayed copy
// to match the actual model behavior.

export const INFERENCE_MAX_DIMENSION: number = __INFERENCE_MAX_DIMENSION__;
