import { Card } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React from "react";

type props = {
    children: React.ReactElement;
    style?: React.CSSProperties;
};

const DisplayCard = (props: props) => {
    const theme = useTheme();
    return (
        <Card
            sx={{
                width: "80%",
                height: "70%",
                backgroundColor: "rgba(0,0,0, 0.4)",
                display: "flex",
                flexDirection: "column",
                borderColor: theme.palette.secondary.main,
                borderRadius: "15px",
                borderStyle: "solid",
                borderWidth: "2px",
                ...props.style,
            }}
        >
            {props.children}
        </Card>
    );
};

export default DisplayCard;
