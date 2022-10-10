import { Container } from "@mantine/core";
import React from "react";

export type LayoutProps = {
  children: React.ReactNode;
};

export const Layout: React.FC<LayoutProps> = (props) => {
  return (
    <Container sx={{ maxWidth: "800px", width: "100%" }}>
      {props.children}
    </Container>
  );
};
