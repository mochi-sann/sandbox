import { createElement } from './core/vdom.js';

export { createElement, render } from './core/vdom.js';
export { renderComponent } from './core/component.js';
export { useState } from './hooks/useState.js';
export { useEffect } from './hooks/useEffect.js';
export type { VNode, Component } from './types/index.js';

const h = createElement;
export { h };
