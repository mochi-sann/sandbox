export interface VNode {
  type: string | Function;
  props: { [key: string]: any };
  children: (VNode | string)[];
}

export interface ComponentInstance {
  vnode: VNode;
  hooks: any[];
  hookIndex: number;
}

export type Component = (props: any) => VNode;

export interface EventHandler {
  (event: Event): void;
}
