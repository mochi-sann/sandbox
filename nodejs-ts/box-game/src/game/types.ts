export type BlockId = 0 | 1 | 2 | 3 | 4

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
  selectedBlockId: Exclude<BlockId, 0>
}

export interface ModifiedBlock extends WorldCoord {
  blockId: BlockId
}
