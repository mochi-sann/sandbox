import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { useFrameLimiter } from '../../hooks/useFrameLimiter'
import { useReducedMotion } from '../../hooks/useReducedMotion'

export function ModelPlaceholder() {
  const meshRef = useRef<Mesh>(null)
  const reducedMotion = useReducedMotion()
  const runAtTargetFrame = useFrameLimiter(45)

  useFrame(() => {
    if (!meshRef.current || reducedMotion) return

    runAtTargetFrame(() => {
      meshRef.current.rotation.y += 0.01
      meshRef.current.rotation.x += 0.004
    })
  })

  return (
    <mesh ref={meshRef} castShadow receiveShadow position={[0, 0.4, 0]}>
      <torusKnotGeometry args={[0.8, 0.28, 220, 32]} />
      <meshStandardMaterial color="#ff7a18" roughness={0.3} metalness={0.6} />
    </mesh>
  )
}
