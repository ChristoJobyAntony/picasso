import { createTheme, responsiveFontSizes } from "@mui/material/styles";

export const palette = {
    paper: "#F5F1E8",
    paperDeep: "#EFE9DA",
    ink: "#0E0E0C",
    inkSoft: "#2A2A26",
    saffron: "#C2410C",
    saffronDeep: "#9A330A",
    slate: "#475569",
    rule: "rgba(14, 14, 12, 0.12)",
};

let theme = createTheme({
    palette: {
        mode: "light",
        background: { default: palette.paper, paper: palette.paper },
        text: { primary: palette.ink, secondary: palette.inkSoft },
        primary: { main: palette.saffron, dark: palette.saffronDeep, contrastText: palette.paper },
        secondary: { main: palette.slate, contrastText: palette.paper },
        divider: palette.rule,
    },
    shape: { borderRadius: 2 },
    typography: {
        fontFamily: ['"Inter"', "system-ui", "sans-serif"].join(", "),
        h1: {
            fontFamily: ['"Fraunces Variable"', '"Fraunces"', "Georgia", "serif"].join(", "),
            fontWeight: 500,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
        },
        h2: {
            fontFamily: ['"Fraunces Variable"', '"Fraunces"', "Georgia", "serif"].join(", "),
            fontWeight: 500,
            letterSpacing: "-0.015em",
            lineHeight: 1.1,
        },
        h3: {
            fontFamily: ['"Fraunces Variable"', '"Fraunces"', "Georgia", "serif"].join(", "),
            fontWeight: 500,
            letterSpacing: "-0.01em",
            lineHeight: 1.15,
        },
        h4: {
            fontFamily: ['"Fraunces Variable"', '"Fraunces"', "Georgia", "serif"].join(", "),
            fontWeight: 500,
        },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" },
        button: { textTransform: "none", fontWeight: 500, letterSpacing: "0.01em" },
        body1: { lineHeight: 1.6 },
    },
    components: {
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: {
                    borderRadius: 2,
                    paddingInline: "1.4rem",
                    paddingBlock: "0.6rem",
                },
                containedPrimary: {
                    color: palette.paper,
                    "&:hover": { backgroundColor: palette.saffronDeep },
                },
                outlined: {
                    borderColor: palette.ink,
                    color: palette.ink,
                    "&:hover": { borderColor: palette.ink, backgroundColor: "rgba(14,14,12,0.04)" },
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                root: { color: palette.ink },
            },
        },
        MuiCssBaseline: {
            styleOverrides: { body: { backgroundColor: palette.paper } },
        },
    },
});

theme = responsiveFontSizes(theme);

export default theme;
