import type { Inventory } from '../inventory/Inventory'
import type { ModifiedBlock, PlayerState } from '../types'
import { deleteSave, loadSave, saveGame } from './db'
import type { SaveData, SaveInventoryState, SavePlayerState } from './saveSchema'

const asSavePlayer = (state: PlayerState): SavePlayerState => ({
  position: state.position,
  velocity: state.velocity,
  yaw: state.yaw,
  pitch: state.pitch,
  grounded: state.grounded,
  cameraMode: state.cameraMode,
})

const asSaveInventory = (inv: Inventory): SaveInventoryState => inv.serialize()

export class SaveRepository {
  public static async load(): Promise<SaveData | null> {
    return loadSave()
  }

  public static async save(
    seed: number,
    player: PlayerState,
    inventory: Inventory,
    modifiedBlocks: ModifiedBlock[],
  ): Promise<void> {
    const data: SaveData = {
      version: 1,
      seed,
      player: asSavePlayer(player),
      inventory: asSaveInventory(inventory),
      modifiedBlocks,
      timestamp: Date.now(),
    }
    await saveGame(data)
  }

  public static async delete(): Promise<void> {
    await deleteSave()
  }
}
