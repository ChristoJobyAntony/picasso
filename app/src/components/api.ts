import axios from "axios";

const apiBaseUrl =
    typeof window !== "undefined" && window.location.port === "3000"
        ? "http://localhost:8000/"
        : "/";

const baseApi = axios.create({
    baseURL: apiBaseUrl,
    timeout: 60000,
    timeoutErrorMessage: "Network error — please try again.",
});

export interface StyleInfo {
    id: string;
    title: string;
    file: string;
    description: string;
}

export const sendFiles = async (
    image: File,
    styleId: string
): Promise<Blob> => {
    const formData = new FormData();
    formData.append("style", styleId);
    formData.append("image", image);
    const res = await baseApi.post("stylize", formData, {
        responseType: "blob",
        headers: {
            Accept: "image/png",
            "Content-Type": "multipart/form-data",
        },
    });
    return res.data as Blob;
};

export const getStyles = async (): Promise<StyleInfo[]> => {
    const res = await baseApi.get<StyleInfo[]>("styles/info");
    return res.data;
};

export const getStyleImagePath = (styleId: string): string =>
    `${baseApi.defaults.baseURL}styles/image/${styleId}`;

export default {
    sendFiles,
    getStyles,
    getStyleImagePath,
};
