export const SVG_SAMPLE_DIR = 'assets/svg-samples';
export const RENDER_COUNT_MAX = 500;
export const RENDER_COUNT_MIN = 1;
export const DEFAULT_RENDER_COUNT = 50;

export type RenderConfig = {
  renderCount: number;
};

const readEnvRenderCount = () => {
  if (typeof process !== 'undefined' && process.env && process.env.RENDER_COUNT) {
    return process.env.RENDER_COUNT;
  }

  if (typeof import.meta !== 'undefined') {
    const meta = (import.meta as { env?: Record<string, unknown> }).env;
    const value = meta?.RENDER_COUNT as unknown;
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
  }

  return undefined;
};

export const resolveRenderCount = (input?: number | string | null): number => {
  const value = Number(input ?? readEnvRenderCount() ?? DEFAULT_RENDER_COUNT);
  if (Number.isNaN(value)) {
    return DEFAULT_RENDER_COUNT;
  }

  if (value < RENDER_COUNT_MIN) {
    return RENDER_COUNT_MIN;
  }

  if (value > RENDER_COUNT_MAX) {
    return RENDER_COUNT_MAX;
  }

  return Math.floor(value);
};

export const createRenderConfig = (input?: number | string | null): RenderConfig => ({
  renderCount: resolveRenderCount(input)
});
