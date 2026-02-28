import { useEffect, useState } from 'react'
import { Texture, TextureLoader } from 'three'
import type { TextureLoadState } from '../lib/r3f/types'

const loader = new TextureLoader()

export function useTextureLoader(url: string): TextureLoadState {
  const [state, setState] = useState<TextureLoadState>({
    texture: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true
    setState({ texture: null, loading: true, error: null })

    loader.load(
      url,
      (texture: Texture) => {
        if (!active) return
        setState({ texture, loading: false, error: null })
      },
      undefined,
      (error: unknown) => {
        if (!active) return
        setState({ texture: null, loading: false, error: error as Error })
      },
    )

    return () => {
      active = false
    }
  }, [url])

  return state
}
