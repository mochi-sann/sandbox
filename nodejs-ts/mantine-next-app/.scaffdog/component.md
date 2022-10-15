---
name: 'component'
root: './src/components'
output: '**/*'
ignore: []
questions:
  name: 'Please enter component name'
---

# `{{ inputs.name | pascal }}/{{ inputs.name | pascal }}.tsx`

```typescript
import { createStyles } from '@mantine/core';

const useStyles = createStyles((theme) => ({
}));

export type {{ inputs.name |   pascal }}Props = {}

export const  {{ inputs.name |   pascal }} = (props: {{ inputs.name |   pascal }}Props) =>  {
  const { classes } = useStyles();

  return (
          <>
  </>
);
}

```
