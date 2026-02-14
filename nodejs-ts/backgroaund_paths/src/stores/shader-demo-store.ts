import { create } from "zustand";

export type ActiveShaderEffect = "mesh" | "dots" | "combined";

interface ShaderDemoState {
  intensity: number;
  speed: number;
  isInteracting: boolean;
  activeEffect: ActiveShaderEffect;
  setIntensity: (value: number) => void;
  setSpeed: (value: number) => void;
  setIsInteracting: (value: boolean) => void;
  setActiveEffect: (value: ActiveShaderEffect) => void;
  reset: () => void;
}

const DEFAULTS = {
  intensity: 1.5,
  speed: 1,
  activeEffect: "mesh" as ActiveShaderEffect,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const useShaderDemoStore = create<ShaderDemoState>((set) => ({
  intensity: DEFAULTS.intensity,
  speed: DEFAULTS.speed,
  isInteracting: false,
  activeEffect: DEFAULTS.activeEffect,
  setIntensity: (value) => set({ intensity: clamp(value, 0.3, 3) }),
  setSpeed: (value) => set({ speed: clamp(value, 0.3, 3) }),
  setIsInteracting: (value) => set({ isInteracting: value }),
  setActiveEffect: (value) => set({ activeEffect: value }),
  reset: () =>
    set({
      intensity: DEFAULTS.intensity,
      speed: DEFAULTS.speed,
      activeEffect: DEFAULTS.activeEffect,
      isInteracting: false,
    }),
}));
