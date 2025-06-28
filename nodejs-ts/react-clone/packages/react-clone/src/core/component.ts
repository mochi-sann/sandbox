import { ComponentInstance, VNode } from "../types/index.js";
import { render } from "./vdom.js";
import { registerInstanceContainer, setRerenderFunction } from "../hooks/useState.js";

let currentInstance: ComponentInstance | null = null;
let componentInstances: Map<Element, ComponentInstance> = new Map();

export function createComponentInstance(vnode: VNode): ComponentInstance {
  return {
    vnode,
    hooks: [],
    hookIndex: 0,
  };
}

export function setCurrentInstance(instance: ComponentInstance | null): void {
  currentInstance = instance;
}

export function getCurrentInstance(): ComponentInstance | null {
  return currentInstance;
}

export function rerender(container: Element): void {
  console.log("Rerender called for container:", container);
  const instance = componentInstances.get(container);
  if (instance) {
    console.log("Found instance, calling renderComponent");
    renderComponent(instance.vnode, container);
  } else {
    console.warn("No instance found for container");
  }
}

export function renderComponent(vnode: VNode, container: Element): void {
  console.log("renderComponent called");
  
  if (typeof vnode.type !== "function") {
    throw new Error("Expected function component");
  }

  let instance = componentInstances.get(container);

  if (!instance) {
    console.log("Creating new instance");
    instance = createComponentInstance(vnode);
    componentInstances.set(container, instance);
  } else {
    console.log("Reusing existing instance");
  }

  // Register instance-container mapping for useState
  registerInstanceContainer(instance, container);
  
  // Set up rerender function reference
  setRerenderFunction(rerender);

  instance.vnode = vnode;
  instance.hookIndex = 0;

  setCurrentInstance(instance);

  try {
    console.log("Calling component function");
    const result = vnode.type(vnode.props);
    console.log("Component function returned result, clearing container");
    container.innerHTML = "";
    console.log("Rendering result to DOM");
    render(result, container);
    console.log("Render complete");
  } finally {
    setCurrentInstance(null);
  }
}
