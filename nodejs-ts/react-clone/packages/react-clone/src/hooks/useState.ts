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

    console.log("setValue called:", { current: hook.value, next: nextValue });

    if (nextValue !== hook.value) {
      hook.value = nextValue;
      console.log("State updated, triggering rerender");

      // Get container from instance mapping
      const container = instanceContainerMap.get(instance);
      console.log("Container found:", !!container, "Rerender function:", !!rerenderFunction);
      
      if (container && rerenderFunction) {
        // Immediate re-render instead of setTimeout
        try {
          rerenderFunction(container);
        } catch (error) {
          console.error("Rerender failed:", error);
          // Fallback to async if synchronous fails
          setTimeout(() => rerenderFunction!(container), 0);
        }
      } else {
        console.warn("Cannot rerender - missing container or rerender function");
      }
    } else {
      console.log("No change in value, skipping rerender");
    }
  };

  return [hook.value, setValue];
}
