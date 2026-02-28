import { act, renderHook } from '@testing-library/react'
import { useViewport } from './useViewport'

describe('useViewport', () => {
  it('returns viewport and updates on resize', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true })

    const { result } = renderHook(() => useViewport())

    expect(result.current.width).toBe(1024)
    expect(result.current.height).toBe(768)
    expect(result.current.isMobile).toBe(false)

    act(() => {
      window.innerWidth = 480
      window.innerHeight = 800
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current.width).toBe(480)
    expect(result.current.height).toBe(800)
    expect(result.current.isMobile).toBe(true)
  })
})
