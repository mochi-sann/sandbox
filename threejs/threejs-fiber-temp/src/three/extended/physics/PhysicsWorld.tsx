import type { PropsWithChildren } from 'react'
import { Physics } from '@react-three/rapier'

export function PhysicsWorld({ children }: PropsWithChildren) {
  return (
    <Physics gravity={[0, -9.81, 0]} colliders="hull">
      {children}
    </Physics>
  )
}
