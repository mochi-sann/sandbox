import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { Mesh } from "three";
import { Model } from "./Anim";

function Box(props: JSX.IntrinsicElements["mesh"]) {
  // This reference will give us direct access to the mesh
  const { speed, scale } = useControls({ speed: 1, scale: 1 });
  const meshRef = useRef<Mesh>(null);
  // Set up state for the hovered and active state
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);
  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame((state, delta) => (meshRef.current.rotation.x += delta * speed));
  // Return view, these are regular three.js elements expressed in JSX
  return (
    <mesh
      {...props}
      ref={meshRef}
      scale={scale}
      onClick={() => setActive(!active)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? "hotpink" : "orange"} />
    </mesh>
  );
}

export const CanvasTest: React.FC = () => {
  return (
    <div>
      {" "}
      <Canvas height="100%" width="100%">
        <ambientLight intensity={Math.PI / 2} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.15}
          penumbra={1}
          decay={0}
          intensity={Math.PI}
        />
        <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
        <Model ></Model>
        <Box position={[-1.2, 0, 0]} />
        <Box position={[1.2, 0, 0]} />
      </Canvas>
    </div>
  );
};
