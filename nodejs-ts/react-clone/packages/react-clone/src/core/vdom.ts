import { VNode } from "../types/index.js";

export function createElement(
  type: string | Function,
  props: any = {},
  ...children: any[]
): VNode {
  return {
    type,
    props: props || {},
    children: children.flat().map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : child
    ),
  };
}

export function createTextNode(text: string): string {
  return text;
}

export function render(vnode: VNode | string, container: Element): void {
  if (typeof vnode === "string") {
    container.appendChild(document.createTextNode(vnode));
    return;
  }

  if (typeof vnode.type === "function") {
    const componentResult = vnode.type(vnode.props);
    render(componentResult, container);
    return;
  }

  const element = document.createElement(vnode.type as string);

  Object.keys(vnode.props).forEach((key) => {
    if (key.startsWith("on") && typeof vnode.props[key] === "function") {
      const eventType = key.slice(2).toLowerCase();
      element.addEventListener(eventType, vnode.props[key]);
    } else if (key === "className") {
      element.className = vnode.props[key];
    } else if (key !== "children") {
      element.setAttribute(key, vnode.props[key]);
    }
  });

  vnode.children.forEach((child) => {
    render(child, element);
  });

  container.appendChild(element);
}

export function diff(
  oldVNode: VNode | string,
  newVNode: VNode | string,
): boolean {
  if (typeof oldVNode !== typeof newVNode) {
    return false;
  }

  if (typeof oldVNode === "string") {
    return oldVNode === newVNode;
  }

  if ((oldVNode as VNode).type !== (newVNode as VNode).type) {
    return false;
  }

  return true;
}

export function patch(
  container: Element,
  oldVNode: VNode | string,
  newVNode: VNode | string,
): void {
  if (!diff(oldVNode, newVNode)) {
    container.innerHTML = "";
    render(newVNode, container);
  }
}
