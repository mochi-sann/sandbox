import { Title, Text, Anchor, Button } from '@mantine/core';
import { InputBar } from '../inputBar/InputBar';
import useStyles from './Welcome.styles';

export function Welcome() {
  const { classes } = useStyles();

  return (
    <>
      <Title className={classes.title} align="center" mt={100}>
        ようこそ
        <Text inherit variant="gradient" component="span">
          Mantine
        </Text>
      </Title>
      <Button>ボタン</Button>
      <InputBar />
      <Text color="dimmed" align="center" size="lg" sx={{ maxWidth: 580 }} mx="auto" mt="xl">
        This starter Next.js project includes a minimal setup for server side rendering, if you want
        to learn more on Mantine + Next.js integration follow{' '}
        <Anchor href="https://mantine.dev/guides/next/" size="lg">
          this guide
        </Anchor>
        . To get started edit index.tsx file.
      </Text>
    </>
  );
}
