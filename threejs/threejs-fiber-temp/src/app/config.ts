export type QualityProfile = 'high' | 'medium' | 'low'

export type ToneMappingMode = 'aces' | 'none'

export interface App3DConfig {
  dprMin: number
  dprMax: number
  shadows: boolean
  toneMapping: ToneMappingMode
  debug: boolean
  qualityProfile: QualityProfile
}

export const defaultApp3DConfig: App3DConfig = {
  dprMin: 1,
  dprMax: 2,
  shadows: true,
  toneMapping: 'aces',
  debug: false,
  qualityProfile: 'high',
}
