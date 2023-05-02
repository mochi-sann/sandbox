import { Canvas } from '@react-three/fiber'

export const Canvases = () => {
  return (
    <Canvas>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
    </Canvas>)
}
