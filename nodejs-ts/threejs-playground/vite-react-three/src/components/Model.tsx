import { useGLTF } from '@react-three/drei'
import { useRef } from 'react';

import { useFrame } from '@react-three/fiber'


export function Model(props: JSX.IntrinsicElements["group"]) {
  const ref = useRef<THREE.Mesh>(!null)

  useFrame((_, delta) => (ref.current.rotation.y += delta))

  const { scene } = useGLTF("/pdca_file_2.glb")
  return <primitive ref={ref} object={scene} {...props} />
}

useGLTF.preload("/pdca_file_2.glb");

