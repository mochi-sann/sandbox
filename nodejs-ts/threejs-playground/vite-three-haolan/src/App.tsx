import { Suspense, useRef, useState } from "react";
import "./App.css";
import { Canvas, MeshProps, extend, useFrame } from "@react-three/fiber";
import { HaolanModel } from "./Components/Haolan";
import { Loader, OrbitControls, TransformControls } from "@react-three/drei";
extend({ OrbitControls, Loader, TransformControls });
import { Mesh } from "three";

function Box(props: MeshProps) {
  // This reference gives us direct access to the THREE.Mesh object
  const ref = useRef<Mesh>(null!);
  // Hold state for hovered and clicked events
  const [hovered, hover] = useState(false);
  const [clicked, click] = useState(false);
  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame((_, delta) => (ref.current.rotation.x += delta));
  // Return the view, these are regular Threejs elements expressed in JSX
  return (
    <mesh
      {...props}
      ref={ref}
      scale={clicked ? 1.5 : 1}
      onClick={(_) => click(!clicked)}
      onPointerOver={(event) => (event.stopPropagation(), hover(true))}
      onPointerOut={(_) => hover(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? "hotpink" : "orange"} />
    </mesh>
  );
}
1;
function App() {
  return (
    <>
      <Canvas>
        <ambientLight />
        <directionalLight />
        <pointLight position={[10, 10, 10]} />
        <TransformControls />
        <HaolanModel />
      </Canvas>
    </>
  );
}

export default App;
