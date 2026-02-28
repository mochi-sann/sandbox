import { Suspense, type ComponentType } from 'react'
import { ACESFilmicToneMapping, NoToneMapping } from 'three'
import { Canvas } from '@react-three/fiber'
import type { App3DConfig } from '../../app/config'
import type { QualityProfile } from '../../app/config'
import { LoadingOverlay } from '../../ui/LoadingOverlay'
import { CanvasErrorBoundary } from '../../ui/CanvasErrorBoundary'
import { DebugTools } from './DebugTools'
import { PerformanceManager } from './PerformanceManager'
import { SceneEnvironment } from './SceneEnvironment'

interface SceneCanvasProps {
  SceneComponent: ComponentType
  config: App3DConfig
}

function resolveDpr(profile: QualityProfile, min: number, max: number): [number, number] {
  if (profile === 'low') {
    return [min, Math.min(min * 1.25, max)]
  }

  if (profile === 'medium') {
    return [min, Math.min(min * 1.6, max)]
  }

  return [min, max]
}

export function SceneCanvas({ SceneComponent, config }: SceneCanvasProps) {
  const dpr = resolveDpr(config.qualityProfile, config.dprMin, config.dprMax)

  return (
    <div className="scene-canvas">
      <CanvasErrorBoundary>
        <Canvas
          dpr={dpr}
          camera={{ fov: 45, position: [3.5, 2.5, 5] }}
          shadows={config.shadows}
          gl={{
            antialias: config.qualityProfile !== 'low',
            toneMapping:
              config.toneMapping === 'aces' ? ACESFilmicToneMapping : NoToneMapping,
          }}
        >
          <Suspense fallback={null}>
            <PerformanceManager />
            <SceneEnvironment />
            <SceneComponent />
            <DebugTools enabled={config.debug} />
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>
      <LoadingOverlay />
    </div>
  )
}
