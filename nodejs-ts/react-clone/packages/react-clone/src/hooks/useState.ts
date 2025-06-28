import { getCurrentInstance } from "../core/component.js";

export function useState<T>(
  initialValue: T,
): [T, (newValue: T | ((prev: T) => T)) => void] {
  const instance = getCurrentInstance();

  if (!instance) {
    throw new Error("useState can only be called inside a component");
  }

  const hookIndex = instance.hookIndex++;

  if (instance.hooks[hookIndex] === undefined) {
    instance.hooks[hookIndex] = {
      value: initialValue,
    };
  }

  const hook = instance.hooks[hookIndex];

  const setValue = (newValue: T | ((prev: T) => T)) => {
    const nextValue = typeof newValue === "function"
      ? (newValue as (prev: T) => T)(hook.value)
      : newValue;

    if (nextValue !== hook.value) {
      hook.value = nextValue;

      const container = findContainerForInstance(instance);
      if (container) {
        import("../core/component.js").then(({ rerender }) => {
          rerender(container);
        });
      }
    }
  };

  return [hook.value, setValue];
}

function findContainerForInstance(targetInstance: any): Element | null {
  // This is a simplified approach - in a real implementation,
  // we'd need a proper way to track container relationships
  const containers = document.querySelectorAll("[data-react-clone-root]");
  return containers[0] as Element || document.body;
}
