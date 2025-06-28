import { getCurrentInstance } from "../core/component.js";

interface EffectHook {
  effect: () => (() => void) | void;
  deps?: any[];
  cleanup?: () => void;
}

export function useEffect(
  effect: () => (() => void) | void,
  deps?: any[],
): void {
  const instance = getCurrentInstance();

  if (!instance) {
    throw new Error("useEffect can only be called inside a component");
  }

  const hookIndex = instance.hookIndex++;
  const prevHook = instance.hooks[hookIndex] as EffectHook | undefined;

  const hasChangedDeps = !prevHook ||
    !deps ||
    !prevHook.deps ||
    deps.some((dep, i) => dep !== prevHook.deps![i]);

  if (hasChangedDeps) {
    if (prevHook?.cleanup) {
      prevHook.cleanup();
    }

    setTimeout(() => {
      const cleanup = effect();
      if (typeof cleanup === "function") {
        instance.hooks[hookIndex] = {
          effect,
          deps: deps ? [...deps] : undefined,
          cleanup,
        };
      } else {
        instance.hooks[hookIndex] = {
          effect,
          deps: deps ? [...deps] : undefined,
        };
      }
    }, 0);
  } else {
    instance.hooks[hookIndex] = prevHook;
  }
}
