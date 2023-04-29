import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import { OrbitControls, Stats, Text, Text3D, useCamera } from '@react-three/drei'
import { AsciiEffect } from 'three-stdlib'
import { Model } from './Model'
import { Vector3 } from 'three'


function Box(props: JSX.IntrinsicElements["mesh"]) {
  const { scale, rotation, position, visible } = useControls("mesh", {
    scale: [1, 1, 1],
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    visible: false
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
      <meshStandardMaterial color={'orange'} />
    </mesh >
  )
}
export const Canvases = () => {
  const { EnbleAsciiRenderer, ...AsciiRendererOptions } = useControls('AsciiRendererOptions', {
    renderIndex: 1,
    bgColor: '#000000',
    fgColor: '#ffffff',
    characters: ' .:-+*=%@#',
    invert: true,
    color: false,
    resolution: { value: 0.18, step: 0.01 },
    EnbleAsciiRenderer: true,
  }
  )

  const { rotation, scale } = useControls('PDCA Model', {
    rotation: { value: [1.5, 0, 0], step: 0.1 },
    scale: [4, 4, 4],
    text: "hello world"
  })
  return (
    <Canvas style={{
      backgroundColor: 'black',
      width: "100%", height: "100%"
    }}>
      <Stats />
      <color attach="background" args={['black']} />

      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />

      <pointLight position={[10, 10, 10]} />
      <pointLight position={[-10, -10, -10]} />
      <OrbitControls />


      <Box position={[0, 0, 0]} scale={[0, 0, 0]} />
      <Suspense>
        <Model receiveShadow={false} rotation={rotation} scale={scale} />
      </Suspense>
      {EnbleAsciiRenderer && <AsciiRenderer {...AsciiRendererOptions} />}

    </Canvas>

  )
}
function AsciiRenderer({
  renderIndex = 1,
  bgColor = 'black',
  fgColor = 'white',
  characters = ' .:-+*=%@#',
  invert = true,
  color = false,
  resolution = 0.15
}) {
  // Reactive state
  const { size, gl, scene, camera } = useThree()

  // Create effect
  const effect = useMemo(() => {
    const effect = new AsciiEffect(gl, characters, { invert, color, resolution })
    effect.domElement.style.position = 'absolute'
    effect.domElement.style.top = '0px'
    effect.domElement.style.left = '0px'
    effect.domElement.style.pointerEvents = 'none'
    return effect
  }, [characters, invert, color, resolution])

  // Styling
  useLayoutEffect(() => {
    effect.domElement.style.color = fgColor
    effect.domElement.style.backgroundColor = bgColor
  }, [fgColor, bgColor])

  // Append on mount, remove on unmount
  useEffect(() => {
    gl.domElement.style.opacity = '0'
    gl.domElement.parentNode.appendChild(effect.domElement)
    return () => {
      gl.domElement.style.opacity = '1'
      gl.domElement.parentNode.removeChild(effect.domElement)
    }
  }, [effect])

  // Set size
  useEffect(() => {
    effect.setSize(size.width, size.height)
  }, [effect, size])

  // Take over render-loop (that is what the index is for)
  useFrame(() => {
    effect.render(scene, camera)
  }, renderIndex)

  // This component returns nothing, it is a purely logical
  return (<></>)
}
