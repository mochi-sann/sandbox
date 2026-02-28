import { Float } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh } from 'three'

export function BasicShapesScene() {
  const torusRef = useRef<Mesh>(null)

  useFrame((_state, delta) => {
    if (!torusRef.current) {
      return
    }

    torusRef.current.rotation.x += delta * 0.4
    torusRef.current.rotation.y += delta * 0.7
  })

  return (
    <group>
      <mesh ref={torusRef} castShadow receiveShadow>
        <torusKnotGeometry args={[0.9, 0.28, 220, 32]} />
        <meshStandardMaterial color="#70e3ff" metalness={0.3} roughness={0.2} />
      </mesh>

      <Float speed={1.8} floatIntensity={1.7} rotationIntensity={0.35}>
        <mesh castShadow position={[-1.8, 0.8, -1.5]}>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial color="#ff9f68" roughness={0.35} />
        </mesh>
      </Float>

      <Float speed={1.3} floatIntensity={1.4} rotationIntensity={0.25}>
        <mesh castShadow position={[1.7, -0.6, -1.2]}>
          <icosahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial color="#9d8dff" roughness={0.4} metalness={0.15} />
        </mesh>
      </Float>

      <mesh receiveShadow position={[0, -1.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#1b2029" roughness={0.95} />
      </mesh>
    </group>
  )
}
