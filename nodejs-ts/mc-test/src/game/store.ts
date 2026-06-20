import { create } from 'zustand'
import type { CameraMode } from './types'
import {
  HOTBAR_SIZE,
  Inventory,
  TOTAL_SLOTS,
  type ItemStack,
} from './inventory/Inventory'
import { matchRecipe } from './inventory/Crafting'
import { getMaxStack } from './registry/items'
import type { SaveData } from './save/saveSchema'

export type GameState = 'menu' | 'playing'

export interface HudData {
  fps: number
  position: [number, number, number]
  cameraMode: CameraMode
  pointerLocked: boolean
}

const CRAFTING_GRID_SIZE = 4

interface GameStore {
  gameState: GameState
  currentSave: SaveData | null
  gameSeed: number
  startGame: (save: SaveData | null) => void
  exitToMenu: () => void

  hud: HudData
  setHud: (partial: Partial<HudData>) => void

  inventory: Inventory
  hotbarSnapshot: (ItemStack | null)[]
  fullSlotsSnapshot: (ItemStack | null)[]
  inventoryOpen: boolean
  heldStack: ItemStack | null

  craftingGrid: (ItemStack | null)[]
  craftingResult: ItemStack | null
  craftingSnapshot: (ItemStack | null)[]

  syncInventory: () => void
  setInventoryOpen: (open: boolean) => void
  pickupOrPlace: (index: number) => void
  pickupOrPlaceCrafting: (index: number) => void
  takeCraftingResult: () => void
}

const createInitialInventory = (): Inventory => {
  const inv = new Inventory()
  inv.addItem(1, 16)
  inv.addItem(3, 16)
  inv.addItem(8, 16)
  return inv
}

const createInventoryFromSave = (save: SaveData): Inventory => {
  const slots = save.inventory.slots.map((s) => (s ? { itemId: s.itemId, count: s.count } : null))
  return new Inventory(slots, save.inventory.selectedHotbar)
}

const initialInventory = createInitialInventory()

const initialHud: HudData = {
  fps: 0,
  position: [0, 0, 0],
  cameraMode: 'first',
  pointerLocked: false,
}

const snapshotSlots = (slots: (ItemStack | null)[]): (ItemStack | null)[] =>
  slots.map((s) => (s ? { itemId: s.itemId, count: s.count } : null))

const recomputeCrafting = (
  grid: (ItemStack | null)[],
): { craftingResult: ItemStack | null; craftingSnapshot: (ItemStack | null)[] } => ({
  craftingResult: matchRecipe(grid),
  craftingSnapshot: snapshotSlots(grid),
})

const initialCrafting = recomputeCrafting(new Array(CRAFTING_GRID_SIZE).fill(null))

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: 'menu',
  currentSave: null,
  gameSeed: 424242,
  startGame: (save) => {
    const inv = save ? createInventoryFromSave(save) : createInitialInventory()
    const seed = save ? save.seed : Math.floor(Math.random() * 1000000)
    set({
      gameState: 'playing',
      currentSave: save,
      gameSeed: seed,
      inventory: inv,
      hotbarSnapshot: snapshotSlots(inv.slots.slice(0, HOTBAR_SIZE)),
      fullSlotsSnapshot: snapshotSlots(inv.slots),
      heldStack: null,
      craftingGrid: new Array(CRAFTING_GRID_SIZE).fill(null),
      craftingResult: null,
      craftingSnapshot: new Array(CRAFTING_GRID_SIZE).fill(null),
      inventoryOpen: false,
    })
  },
  exitToMenu: () => set({ gameState: 'menu', inventoryOpen: false, heldStack: null }),

  hud: initialHud,
  setHud: (partial) => set((state) => ({ hud: { ...state.hud, ...partial } })),

  inventory: initialInventory,
  hotbarSnapshot: snapshotSlots(initialInventory.slots.slice(0, HOTBAR_SIZE)),
  fullSlotsSnapshot: snapshotSlots(initialInventory.slots),
  inventoryOpen: false,
  heldStack: null,

  craftingGrid: new Array(CRAFTING_GRID_SIZE).fill(null),
  craftingResult: initialCrafting.craftingResult,
  craftingSnapshot: initialCrafting.craftingSnapshot,

  syncInventory: () =>
    set((state) => ({
      hotbarSnapshot: snapshotSlots(state.inventory.slots.slice(0, HOTBAR_SIZE)),
      fullSlotsSnapshot: snapshotSlots(state.inventory.slots),
    })),

  setInventoryOpen: (open) => set({ inventoryOpen: open }),

  pickupOrPlace: (index) => {
    if (index < 0 || index >= TOTAL_SLOTS) {
      return
    }
    const state = get()
    const inv = state.inventory
    const held = state.heldStack
    const slot = inv.slots[index]

    if (!held && slot) {
      inv.slots[index] = null
      set({ heldStack: slot, fullSlotsSnapshot: snapshotSlots(inv.slots) })
      return
    }

    if (held && !slot) {
      inv.slots[index] = held
      set({ heldStack: null, fullSlotsSnapshot: snapshotSlots(inv.slots) })
      return
    }

    if (held && slot) {
      if (held.itemId === slot.itemId) {
        const max = getMaxStack(held.itemId)
        const add = Math.min(max - slot.count, held.count)
        slot.count += add
        held.count -= add
        set({
          heldStack: held.count <= 0 ? null : held,
          fullSlotsSnapshot: snapshotSlots(inv.slots),
        })
      } else {
        inv.slots[index] = held
        set({ heldStack: slot, fullSlotsSnapshot: snapshotSlots(inv.slots) })
      }
    }
  },

  pickupOrPlaceCrafting: (index) => {
    if (index < 0 || index >= CRAFTING_GRID_SIZE) {
      return
    }
    const state = get()
    const grid = state.craftingGrid
    const held = state.heldStack
    const slot = grid[index]

    if (!held && slot) {
      grid[index] = null
      set({
        heldStack: slot,
        ...recomputeCrafting(grid),
      })
      return
    }

    if (held && !slot) {
      grid[index] = held
      set({
        heldStack: null,
        ...recomputeCrafting(grid),
      })
      return
    }

    if (held && slot) {
      if (held.itemId === slot.itemId) {
        const max = getMaxStack(held.itemId)
        const add = Math.min(max - slot.count, held.count)
        slot.count += add
        held.count -= add
        set({
          heldStack: held.count <= 0 ? null : held,
          ...recomputeCrafting(grid),
        })
      } else {
        grid[index] = held
        set({
          heldStack: slot,
          ...recomputeCrafting(grid),
        })
      }
    }
  },

  takeCraftingResult: () => {
    const state = get()
    const result = state.craftingResult
    if (!result) {
      return
    }
    const held = state.heldStack
    if (held) {
      if (held.itemId !== result.itemId || held.count + result.count > getMaxStack(result.itemId)) {
        return
      }
      held.count += result.count
    }
    const grid = state.craftingGrid
    for (let i = 0; i < grid.length; i += 1) {
      const slot = grid[i]
      if (slot) {
        slot.count -= 1
        if (slot.count <= 0) {
          grid[i] = null
        }
      }
    }
    set({
      heldStack: held ?? { itemId: result.itemId, count: result.count },
      ...recomputeCrafting(grid),
    })
  },
}))

export { HOTBAR_SIZE, TOTAL_SLOTS, CRAFTING_GRID_SIZE }
