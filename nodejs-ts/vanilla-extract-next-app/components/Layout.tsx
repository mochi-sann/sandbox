import React from "react";
import {LayoutCss} from "./Layout.css";

export  type LayoutProps = {
  children: React.ReactNode
}
const Layout: React.VFC<LayoutProps> = (props) => {
  return <div className={LayoutCss}>{props.children}</div>
}
export {Layout}
