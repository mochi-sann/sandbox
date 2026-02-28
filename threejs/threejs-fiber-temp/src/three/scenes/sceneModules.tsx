import { lazy } from 'react'
import type { SceneModule } from './types'

const BasicShapesScene = lazy(async () => {
  const module = await import('./BasicShapesScene')
  return { default: module.BasicShapesScene }
})

const LightingStudioScene = lazy(async () => {
  const module = await import('./LightingStudioScene')
  return { default: module.LightingStudioScene }
})

export const sceneModules: SceneModule[] = [
  {
    id: 'basic-shapes',
    title: 'Basic Shapes',
    description: 'ジオメトリとアニメーションの最小例。',
    Component: BasicShapesScene,
  },
  {
    id: 'lighting-studio',
    title: 'Lighting Studio',
    description: '材質・ライティング確認用シーン。',
    Component: LightingStudioScene,
  },
]
