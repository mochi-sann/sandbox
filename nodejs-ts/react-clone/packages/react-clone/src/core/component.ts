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
  const instance = componentInstances.get(container);
  if (instance) {
    renderComponent(instance.vnode, container);
  }
}

export function renderComponent(vnode: VNode, container: Element): void {
  if (typeof vnode.type !== "function") {
    throw new Error("Expected function component");
  }

  let instance = componentInstances.get(container);

  if (!instance) {
    instance = createComponentInstance(vnode);
    componentInstances.set(container, instance);
  }

  // Register instance-container mapping for useState
  registerInstanceContainer(instance, container);
  
  // Set up rerender function reference
  setRerenderFunction(rerender);

  instance.vnode = vnode;
  instance.hookIndex = 0;

  setCurrentInstance(instance);

  try {
    const result = vnode.type(vnode.props);
    container.innerHTML = "";
    render(result, container);
  } finally {
    setCurrentInstance(null);
  }
}
