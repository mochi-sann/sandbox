import { renderHook } from '@testing-library/react'
import { useReducedMotion } from './useReducedMotion'

describe('useReducedMotion', () => {
  it('reads prefers-reduced-motion from matchMedia', () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    const mockMedia = {
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener)
      },
      removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener)
      },
      dispatchEvent: () => true,
      addListener: () => {},
      removeListener: () => {},
    }

    vi.stubGlobal('matchMedia', () => mockMedia)

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)

    vi.unstubAllGlobals()
  })
})
