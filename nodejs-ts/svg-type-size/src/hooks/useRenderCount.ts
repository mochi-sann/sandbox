import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { resolveRenderCount, DEFAULT_RENDER_COUNT } from '~config/benchmark.config';

export const useRenderCount = () => {
  const [params, setParams] = useSearchParams();

  const renderCount = useMemo(() => {
    const queryValue = params.get('count');
    if (queryValue) {
      return resolveRenderCount(queryValue);
    }

    return resolveRenderCount(DEFAULT_RENDER_COUNT);
  }, [params]);

  const setRenderCount = useCallback(
    (nextCount: number) => {
      const clamped = resolveRenderCount(nextCount);
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.set('count', String(clamped));
        return next;
      }, { replace: true });
    },
    [setParams]
  );

  return { renderCount, setRenderCount } as const;
};
