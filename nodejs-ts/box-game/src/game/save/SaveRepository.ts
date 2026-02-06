import type { ModifiedBlock, PlayerState } from '../types'
import type { SaveData, SavePlayerState } from './saveSchema'

const STORAGE_KEY = 'box-game-save-v1'

const asSavePlayerState = (state: PlayerState): SavePlayerState => ({
  position: state.position,
  velocity: state.velocity,
  yaw: state.yaw,
  pitch: state.pitch,
  cameraMode: state.cameraMode,
  selectedBlockId: state.selectedBlockId,
})

export class SaveRepository {
  public static load(): SaveData | null {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    try {
      const parsed = JSON.parse(raw) as SaveData
      if (parsed.version !== 1) {
        return null
      }
      return parsed
    } catch {
      return null
    }
  }

  public static save(seed: number, player: PlayerState, modifiedBlocks: ModifiedBlock[]): void {
    const payload: SaveData = {
      version: 1,
      seed,
      player: asSavePlayerState(player),
      modifiedBlocks,
      timestamp: Date.now(),
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }
}
