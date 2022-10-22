import { globalStyle, style } from "@vanilla-extract/css";

export const HelloWorldCss = style({
  background: "#ff00ff",
  color: "blue",
  padding: "16px",
  borderRadius: "20px",
  boxShadow: "10px 10px 10px #00000088",
  transition: "opacity .1s ease", // Testing autoprefixer
  ":hover": {
    opacity: 0.9,
  },
  "@media": {
    "screen and (min-width: 768px)": {
      background: "#ff000b",
    },
  },
});
globalStyle(`${HelloWorldCss} h2`, {
  color: "#00ff00",
});
