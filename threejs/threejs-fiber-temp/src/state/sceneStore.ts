import { create } from 'zustand'
import type { QualityProfile } from '../app/config'

interface SceneState {
  activeSceneId: string
  debug: boolean
  qualityProfile: QualityProfile
  adaptiveQuality: boolean
  setActiveScene: (id: string) => void
  toggleDebug: () => void
  setQualityProfile: (profile: QualityProfile) => void
  setAdaptiveQuality: (enabled: boolean) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  activeSceneId: 'basic-shapes',
  debug: false,
  qualityProfile: 'high',
  adaptiveQuality: true,
  setActiveScene: (id) => set({ activeSceneId: id }),
  toggleDebug: () => set((state) => ({ debug: !state.debug })),
  setQualityProfile: (profile) => set({ qualityProfile: profile }),
  setAdaptiveQuality: (enabled) => set({ adaptiveQuality: enabled }),
}))
