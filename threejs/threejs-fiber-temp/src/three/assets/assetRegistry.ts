import { useGLTF } from '@react-three/drei'

const modelPaths = {
  sample: '/models/sample.glb',
} as const

export type ModelName = keyof typeof modelPaths

export function getModelPath(name: ModelName): string {
  return modelPaths[name]
}

export function preloadModel(name: ModelName): void {
  useGLTF.preload(getModelPath(name))
}

export function preloadAll(): void {
  Object.values(modelPaths).forEach((path) => {
    useGLTF.preload(path)
  })
}
