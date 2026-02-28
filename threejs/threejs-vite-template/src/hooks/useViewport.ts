import { useEffect, useState } from 'react'
import { BREAKPOINT_MOBILE } from '../lib/r3f/constants'
import type { ViewportState } from '../lib/r3f/types'

function getViewportState(): ViewportState {
  const width = window.innerWidth
  const height = window.innerHeight

  return {
    width,
    height,
    isMobile: width <= BREAKPOINT_MOBILE,
  }
}

export function useViewport(): ViewportState {
  const [viewport, setViewport] = useState<ViewportState>(() => getViewportState())

  useEffect(() => {
    const onResize = () => setViewport(getViewportState())
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return viewport
}
