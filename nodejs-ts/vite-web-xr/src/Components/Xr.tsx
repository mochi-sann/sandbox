"use client";

import { Sphere } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { VRButton, XR } from "@react-three/xr";


export  function Xr() {
  return (
        <main className="container mx-auto">
      <h1 className="mt-4 mb-4 text-4xl">React Three XR</h1>
      <div className="mb-4">
        <VRButton></VRButton>
      </div>
      <Canvas className="aspect-video border border-gray-300">
        <XR>
          <Sphere>
            <ambientLight intensity={0.1}></ambientLight>
            <pointLight intensity={0.8} position={[10, 10, 10]}></pointLight>
            <meshStandardMaterial color="#fafafa"></meshStandardMaterial>
          </Sphere>
        </XR>
      </Canvas>
    </main>

  );
}

