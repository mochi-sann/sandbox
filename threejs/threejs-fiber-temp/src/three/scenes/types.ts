import type { ComponentType } from 'react'

export interface SceneModule {
  id: string
  title: string
  description?: string
  Component: ComponentType
  preload?: () => void
}
