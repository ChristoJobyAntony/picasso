import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import "./css/Carousel.css";
import { ChildCare } from "@mui/icons-material";

export const CarouselItem = (props: {
    children?: React.ReactElement;
    key?: string;
    style?: React.CSSProperties;
}) => {
    return (
        <div
            className="carousel-item"
            style={{ width: "100%", ...props.style }}
        >
            {props.children}
        </div>
    );
};

type CarouselProps = {
    children: React.ReactElement[] | React.ReactElement;
    activeIndex: number;
    style?: React.CSSProperties;
};
export const Carousel = (props: CarouselProps) => {
    // const [activeIndex, setActiveIndex] = useState(0);
    return (
        <div className="carousel" style={props.style}>
            <div
                className="inner"
                style={{
                    transform: `translateX(-${props.activeIndex * 100}%)`,
                }}
            >
                {Array.isArray(props.children)
                    ? props.children.map((child) => {
                          return React.cloneElement(child);
                      })
                    : React.cloneElement(props.children)}
            </div>
        </div>
    );
};

export default Carousel;
