import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Lights } from './Lights'
import { ModelPlaceholder } from './ModelPlaceholder'
import { PerfPanel } from '../debug/PerfPanel'
import { CAMERA_SETTINGS } from '../../lib/r3f/constants'
import { getDprForWidth, shouldEnableShadows } from '../../lib/r3f/performance'
import type { ViewportState } from '../../lib/r3f/types'

type SceneCanvasProps = {
  viewport: ViewportState
}

export function SceneCanvas({ viewport }: SceneCanvasProps) {
  const camera = viewport.isMobile
    ? CAMERA_SETTINGS.mobile
    : CAMERA_SETTINGS.desktop

  return (
    <Canvas
      className="scene-canvas"
      shadows={shouldEnableShadows(viewport.width)}
      dpr={getDprForWidth(viewport.width)}
      camera={{
        fov: camera.fov,
        near: camera.near,
        far: camera.far,
        position: [...camera.position],
      }}
    >
      <color attach="background" args={['#f7f7f2']} />
      <Suspense fallback={null}>
        <PerfPanel />
        <Lights />
        <ModelPlaceholder />
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <planeGeometry args={[14, 14]} />
          <meshStandardMaterial color="#e8eced" roughness={0.9} metalness={0.05} />
        </mesh>
      </Suspense>
      <OrbitControls
        makeDefault
        enablePan={!viewport.isMobile}
        minDistance={viewport.isMobile ? 3 : 2}
        maxDistance={viewport.isMobile ? 8 : 10}
        maxPolarAngle={Math.PI / 1.7}
      />
    </Canvas>
  )
}
