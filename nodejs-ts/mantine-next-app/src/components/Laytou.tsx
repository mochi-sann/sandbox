import React from 'react';
import { Container } from '@mantine/core';

type LayoutProps = {
  children: React.ReactNode;
};
const Layout: React.FC<LayoutProps> = (props) => {
  return <Container size="md">{props.children}</Container>;
};
export { Layout };
