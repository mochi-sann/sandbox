import { useCallback, useRef } from 'react'
import { PERFORMANCE_SETTINGS } from '../lib/r3f/constants'

export function useFrameLimiter(targetFps = PERFORMANCE_SETTINGS.targetFps) {
  const previous = useRef<number>(0)
  const frameDuration = 1000 / targetFps

  return useCallback(
    (callback: () => void) => {
      const now = performance.now()
      if (now - previous.current < frameDuration) {
        return
      }

      previous.current = now
      callback()
    },
    [frameDuration],
  )
}
