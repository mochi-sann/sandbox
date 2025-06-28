import { getCurrentInstance } from "../core/component.js";

// Global registry for component instances and their containers
const instanceContainerMap = new WeakMap();
let rerenderFunction: ((container: Element) => void) | null = null;

export function registerInstanceContainer(instance: any, container: Element): void {
  instanceContainerMap.set(instance, container);
}

export function setRerenderFunction(fn: (container: Element) => void): void {
  rerenderFunction = fn;
}

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

      // Get container from instance mapping
      const container = instanceContainerMap.get(instance);
      if (container && rerenderFunction) {
        // Schedule re-render asynchronously
        setTimeout(() => rerenderFunction!(container), 0);
      }
    }
  };

  return [hook.value, setValue];
}
