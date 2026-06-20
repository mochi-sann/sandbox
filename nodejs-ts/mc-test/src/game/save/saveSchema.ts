import type { CameraMode, ModifiedBlock } from '../types'
import type { ItemStack } from '../inventory/Inventory'

export interface SavePlayerState {
  position: [number, number, number]
  velocity: [number, number, number]
  yaw: number
  pitch: number
  grounded: boolean
  cameraMode: CameraMode
}

export interface SaveInventoryState {
  slots: (ItemStack | null)[]
  selectedHotbar: number
}

export interface SaveDataV1 {
  version: 1
  seed: number
  player: SavePlayerState
  inventory: SaveInventoryState
  modifiedBlocks: ModifiedBlock[]
  timestamp: number
}

export type SaveData = SaveDataV1
