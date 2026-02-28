export const BREAKPOINT_MOBILE = 768

export const CAMERA_SETTINGS = {
  desktop: {
    fov: 50,
    near: 0.1,
    far: 100,
    position: [4, 3, 6] as const,
  },
  mobile: {
    fov: 60,
    near: 0.1,
    far: 100,
    position: [3, 2.5, 5] as const,
  },
}

export const PERFORMANCE_SETTINGS = {
  desktopDpr: [1, 2] as [number, number],
  mobileDpr: [1, 1.5] as [number, number],
  targetFps: 60,
}
