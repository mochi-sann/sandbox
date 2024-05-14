import "./App.css";

// src/App.js
import React, { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ShaderMaterial } from "three";
import { ColorfulShader } from "./shaders/ColorfulShader";

const AnimatedCube = () => {
  const meshRef = useRef();
  const shaderMaterialRef = useRef();

  useFrame((state) => {
    const { clock } = state;
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.u_time.value = clock.getElapsedTime();
    }
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[10, 10, -5]} />
      <shaderMaterial
        ref={shaderMaterialRef}
        attach="material"
        args={[ColorfulShader]}
      />
    </mesh>
  );
};

const App = () => {
  return (
    <div className="App">
      <Canvas>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <AnimatedCube />
      </Canvas>
    </div>
  );
};

export default App;
