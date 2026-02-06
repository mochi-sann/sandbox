import type { BlockId, CameraMode, ModifiedBlock } from '../types'

export interface SavePlayerState {
  position: [number, number, number]
  velocity: [number, number, number]
  yaw: number
  pitch: number
  cameraMode: CameraMode
  selectedBlockId: Exclude<BlockId, 0>
}

export interface SaveDataV1 {
  version: 1
  seed: number
  player: SavePlayerState
  modifiedBlocks: ModifiedBlock[]
  timestamp: number
}

export type SaveData = SaveDataV1
