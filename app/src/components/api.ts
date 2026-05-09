// Static loader for style metadata + image paths.
//
// Both the styles.json index and the JPEGs themselves are served from
// /public/styles, so this module is a thin wrapper around fetch and a path
// helper. There is no longer a backend API to call — inference runs entirely
// in the browser via app/src/lib/styleTransfer.ts.

// import.meta.env.BASE_URL is the Vite-resolved public base ("/" in dev,
// "/picasso/" under GitHub Pages) and always ends with a trailing slash.
const STYLES_BASE_URL = `${import.meta.env.BASE_URL}styles`;

export interface StyleInfo {
    id: string;
    title: string;
    file: string;
    description: string;
}

let stylesPromise: Promise<StyleInfo[]> | null = null;

export const getStyles = async (): Promise<StyleInfo[]> => {
    if (!stylesPromise) {
        stylesPromise = fetch(`${STYLES_BASE_URL}/styles.json`)
            .then((res) => {
                if (!res.ok) throw new Error(`styles.json: ${res.status}`);
                return res.json() as Promise<StyleInfo[]>;
            })
            .catch((err) => {
                stylesPromise = null;
                throw err;
            });
    }
    return stylesPromise;
};

export const getStyleImagePath = (style: StyleInfo): string =>
    `${STYLES_BASE_URL}/${style.file}`;

export default {
    getStyles,
    getStyleImagePath,
};
