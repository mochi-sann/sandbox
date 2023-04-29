import { useGLTF, MeshReflectorMaterial, Environment, Stage, PresentationControls } from '@react-three/drei'



export function Model(props: JSX.IntrinsicElements["group"]) {
  const { scene } = useGLTF("/pdca_file_2.glb")
  return <primitive object={scene} {...props} />
}

useGLTF.preload("/pdca_file_2.glb");

