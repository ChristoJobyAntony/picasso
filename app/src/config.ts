// Build-time configuration baked into the bundle by Vite.
//
// Source of truth: PICASSO_INFERENCE_MAX_DIMENSION env var, read by Vite at
// build time (in vite.config.ts) and used by the in-browser TF.js inference
// path to cap the long-edge resize.

export const INFERENCE_MAX_DIMENSION: number = __INFERENCE_MAX_DIMENSION__;
