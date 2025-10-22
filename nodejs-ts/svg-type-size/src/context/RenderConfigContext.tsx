import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createRenderConfig } from '~config/benchmark.config';
import { useRenderCount } from '../hooks/useRenderCount';

type RenderConfigState = {
  renderCount: number;
  setRenderCount: (value: number) => void;
};

const RenderConfigContext = createContext<RenderConfigState | null>(null);

type Props = {
  children: ReactNode;
};

export const RenderConfigProvider = ({ children }: Props) => {
  const { renderCount, setRenderCount } = useRenderCount();

  const value = useMemo<RenderConfigState>(
    () => ({ renderCount: createRenderConfig(renderCount).renderCount, setRenderCount }),
    [renderCount, setRenderCount]
  );

  return <RenderConfigContext.Provider value={value}>{children}</RenderConfigContext.Provider>;
};

export const useRenderConfig = () => {
  const context = useContext(RenderConfigContext);
  if (!context) {
    throw new Error('useRenderConfig must be used within RenderConfigProvider');
  }
  return context;
};
