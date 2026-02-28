import { Bloom, EffectComposer, Noise } from '@react-three/postprocessing'

export function BasicPostProcessing() {
  return (
    <EffectComposer>
      <Bloom mipmapBlur intensity={0.45} luminanceThreshold={0.2} />
      <Noise opacity={0.015} />
    </EffectComposer>
  )
}
