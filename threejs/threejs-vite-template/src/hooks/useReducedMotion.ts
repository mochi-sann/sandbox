import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(QUERY)
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches)

    media.addEventListener('change', handler)
    return () => {
      media.removeEventListener('change', handler)
    }
  }, [])

  return reduced
}
