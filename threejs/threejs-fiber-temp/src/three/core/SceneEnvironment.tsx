export function SceneEnvironment() {
  return (
    <>
      <color attach="background" args={['#0f1218']} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#d5ddff', '#263238', 0.45]} />
      <directionalLight
        castShadow
        position={[5, 7, 4]}
        intensity={1.1}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
    </>
  )
}
