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
  console.log("🎣 useState called, hookIndex:", hookIndex, "initialValue:", initialValue);

  if (instance.hooks[hookIndex] === undefined) {
    console.log("🎣 Creating new hook at index", hookIndex);
    instance.hooks[hookIndex] = {
      value: initialValue,
    };
  } else {
    console.log("🎣 Reusing existing hook at index", hookIndex, "current value:", instance.hooks[hookIndex].value);
  }

  const hook = instance.hooks[hookIndex];
  console.log("🎣 Returning current value:", hook.value);

  const setValue = (newValue: T | ((prev: T) => T)) => {
    const nextValue = typeof newValue === "function"
      ? (newValue as (prev: T) => T)(hook.value)
      : newValue;

    console.log("🔄 setValue called:", { current: hook.value, next: nextValue, hookIndex });

    // Always update the value, even if it seems the same (for debugging)
    const oldValue = hook.value;
    hook.value = nextValue;
    console.log("🔄 State updated from", oldValue, "to", hook.value);

    // Get container from instance mapping
    const container = instanceContainerMap.get(instance);
    console.log("🔄 Container found:", !!container, "Rerender function:", !!rerenderFunction);
    
    if (container && rerenderFunction) {
      console.log("🔄 Triggering rerender...");
      // Immediate re-render instead of setTimeout
      try {
        rerenderFunction(container);
        console.log("🔄 Rerender completed successfully");
      } catch (error) {
        console.error("🔄 Rerender failed:", error);
        // Fallback to async if synchronous fails
        setTimeout(() => {
          console.log("🔄 Retrying rerender async...");
          rerenderFunction!(container);
        }, 0);
      }
    } else {
      console.warn("🔄 Cannot rerender - missing container or rerender function");
    }
  };

  return [hook.value, setValue];
}
