import { Grid, OrbitControls, Stats } from '@react-three/drei'

interface DebugToolsProps {
  enabled: boolean
}

export function DebugTools({ enabled }: DebugToolsProps) {
  if (!enabled) {
    return null
  }

  return (
    <>
      <OrbitControls makeDefault />
      <axesHelper args={[3]} />
      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        sectionSize={2}
        sectionThickness={1}
        fadeDistance={30}
        fadeStrength={1}
      />
      <Stats className="r3f-stats" />
    </>
  )
}
