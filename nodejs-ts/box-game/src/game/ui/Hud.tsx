import type { CameraMode } from '../types'

export interface HudData {
  fps: number
  position: [number, number, number]
  selectedBlockId: number
  cameraMode: CameraMode
  pointerLocked: boolean
}

const blockLabels: Record<number, string> = {
  1: 'Grass',
  2: 'Dirt',
  3: 'Stone',
  4: 'Wood',
}

interface Props {
  data: HudData
}

export function Hud({ data }: Props) {
  return (
    <div className="hud-root">
      <div className="crosshair" />
      <div className="hud-panel top-left">
        <div>FPS: {data.fps}</div>
        <div>
          Pos: {data.position[0].toFixed(1)}, {data.position[1].toFixed(1)}, {data.position[2].toFixed(1)}
        </div>
        <div>View: {data.cameraMode === 'first' ? 'First' : 'Third'}</div>
        <div>Block: {blockLabels[data.selectedBlockId] ?? 'Unknown'}</div>
      </div>
      {!data.pointerLocked ? (
        <div className="hud-panel center-hint">Click to lock pointer and start</div>
      ) : null}
      <div className="hud-panel bottom-help">
        WASD Move / Space Jump / Shift Slow / LMB Break / RMB Place / 1-4 Select / F5 Camera
      </div>
    </div>
  )
}
