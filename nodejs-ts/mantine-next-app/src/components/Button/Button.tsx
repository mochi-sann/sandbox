import { Button } from '@mantine/core';
import React from 'react';

export type ButtonProps = {
  children: React.ReactNode;
  fullWidth?: boolean;
};

const CustumButton: React.FC<ButtonProps> = (props) => (
  <Button
    sx={{
      width: props.fullWidth ? '100%' : 'auto',
    }}
  >
    {props.children}
  </Button>
);

export { CustumButton };
