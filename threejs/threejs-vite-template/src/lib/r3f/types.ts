import type { Texture } from 'three'

export type ViewportState = {
  width: number
  height: number
  isMobile: boolean
}

export type TextureLoadState = {
  texture: Texture | null
  loading: boolean
  error: Error | null
}
