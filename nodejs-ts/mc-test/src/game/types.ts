export type BlockId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export type CameraMode = 'first' | 'third'

export interface ChunkCoord {
  cx: number
  cz: number
}

export interface WorldCoord {
  x: number
  y: number
  z: number
}

export interface PlayerState {
  position: [number, number, number]
  velocity: [number, number, number]
  yaw: number
  pitch: number
  grounded: boolean
  cameraMode: CameraMode
}

export interface ModifiedBlock extends WorldCoord {
  blockId: BlockId
}

export interface RaycastHit {
  block: WorldCoord
  previous: WorldCoord
  normal: [number, number, number]
}
