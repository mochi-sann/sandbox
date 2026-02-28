export function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 8, 4]} intensity={1.1} castShadow />
    </>
  )
}
