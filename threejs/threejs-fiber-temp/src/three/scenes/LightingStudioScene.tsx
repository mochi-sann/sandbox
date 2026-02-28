import { ContactShadows, MeshTransmissionMaterial } from '@react-three/drei'

export function LightingStudioScene() {
  return (
    <group>
      <mesh castShadow position={[0, 0.2, 0]}>
        <sphereGeometry args={[1, 128, 128]} />
        <MeshTransmissionMaterial
          thickness={0.35}
          roughness={0.15}
          chromaticAberration={0.03}
          ior={1.22}
        />
      </mesh>

      <mesh position={[-2.1, -0.15, 0.2]} castShadow>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial color="#ffa46a" metalness={0.7} roughness={0.2} />
      </mesh>

      <mesh position={[2.1, -0.2, -0.2]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 1.1, 48]} />
        <meshStandardMaterial color="#7fc8ff" metalness={0.25} roughness={0.3} />
      </mesh>

      <ContactShadows
        position={[0, -1.1, 0]}
        scale={12}
        blur={2.2}
        far={5}
        opacity={0.48}
      />
    </group>
  )
}
