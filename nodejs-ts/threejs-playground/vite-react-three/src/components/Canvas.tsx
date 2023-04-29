import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useControls } from 'leva'

function Box(props: JSX.IntrinsicElements["mesh"]) {
  const { scale, rotation, position, visible } = useControls({
    scale: [1, 1, 1],
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    visible: true
  })

  // This reference will give us direct access to the mesh
  const mesh = useRef<THREE.Mesh>(null!)
  // Set up state for the hovered and active state
  const [hovered, setHover] = useState(false)
  // Subscribe this component to the render-loop, rotate the mesh every frame
  // useFrame((_, delta) => (mesh.current.rotation.x += delta))
  // Return view, these are regular three.js elements expressed in JSX
  return (
    <mesh
      {...props}
      ref={mesh}
      scale={scale}
      rotation={rotation}
      position={position}
      visible={visible}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh >
  )
}
export const Canvases = () => {
  return (
    <Canvas style={{
      width: "100%", height: "100%"
    }}>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box position={[0, 0, 0]} scale={[0, 0, 0]} />
    </Canvas>

  )
}
