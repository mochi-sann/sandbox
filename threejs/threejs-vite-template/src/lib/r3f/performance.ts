import { BREAKPOINT_MOBILE, PERFORMANCE_SETTINGS } from './constants'

export function isMobileWidth(width: number): boolean {
  return width <= BREAKPOINT_MOBILE
}

export function getDprForWidth(width: number): readonly [number, number] {
  return isMobileWidth(width)
    ? PERFORMANCE_SETTINGS.mobileDpr
    : PERFORMANCE_SETTINGS.desktopDpr
}

export function shouldEnableShadows(width: number): boolean {
  return !isMobileWidth(width)
}
