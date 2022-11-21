import React from "react";
import { Link, Outlet } from "react-router-dom";

export type DefaultLayoutProps = {};

export const DefaultLayout: React.FC<DefaultLayoutProps> = (props) => {
  return (
    <div>
      <p>this is レイアウト</p>
      <main>
        <Outlet />
      </main>
    </div>
  );
};
