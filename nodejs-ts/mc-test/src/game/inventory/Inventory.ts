import type { BlockId } from '../types'
import { getBlockDropItem } from '../registry/blocks'
import { getMaxStack, isBlockItem, type ItemId } from '../registry/items'

export interface ItemStack {
  itemId: ItemId
  count: number
}

export const HOTBAR_SIZE = 9
export const MAIN_SIZE = 27
export const TOTAL_SLOTS = HOTBAR_SIZE + MAIN_SIZE

const createEmptySlots = (): (ItemStack | null)[] => new Array(TOTAL_SLOTS).fill(null)

export class Inventory {
  public slots: (ItemStack | null)[]
  public selectedHotbar: number

  public constructor(slots: (ItemStack | null)[] = createEmptySlots(), selectedHotbar = 0) {
    this.slots = slots
    this.selectedHotbar = Math.max(0, Math.min(HOTBAR_SIZE - 1, selectedHotbar))
  }

  public selectHotbar(index: number): void {
    if (index >= 0 && index < HOTBAR_SIZE) {
      this.selectedHotbar = index
    }
  }

  public scrollHotbar(delta: number): void {
    const next = this.selectedHotbar + delta
    const wrapped = ((next % HOTBAR_SIZE) + HOTBAR_SIZE) % HOTBAR_SIZE
    this.selectedHotbar = wrapped
  }

  public getSelectedStack(): ItemStack | null {
    return this.slots[this.selectedHotbar]
  }

  public getSelectedBlockId(): BlockId {
    const stack = this.getSelectedStack()
    if (!stack || !isBlockItem(stack.itemId)) {
      return 0
    }
    return stack.itemId as BlockId
  }

  public addItem(itemId: ItemId, count: number): number {
    const maxStack = getMaxStack(itemId)
    let remaining = count

    for (let i = 0; i < TOTAL_SLOTS && remaining > 0; i += 1) {
      const slot = this.slots[i]
      if (slot && slot.itemId === itemId && slot.count < maxStack) {
        const add = Math.min(maxStack - slot.count, remaining)
        slot.count += add
        remaining -= add
      }
    }

    for (let i = 0; i < TOTAL_SLOTS && remaining > 0; i += 1) {
      if (this.slots[i] === null) {
        const add = Math.min(maxStack, remaining)
        this.slots[i] = { itemId, count: add }
        remaining -= add
      }
    }

    return remaining
  }

  public removeFromSelected(count: number): boolean {
    const slot = this.slots[this.selectedHotbar]
    if (!slot || slot.count < count) {
      return false
    }
    slot.count -= count
    if (slot.count <= 0) {
      this.slots[this.selectedHotbar] = null
    }
    return true
  }

  public collectBlockDrop(blockId: BlockId): void {
    const dropItem = getBlockDropItem(blockId)
    if (dropItem === null) {
      return
    }
    this.addItem(dropItem, 1)
  }

  public canPlaceSelected(): boolean {
    const stack = this.getSelectedStack()
    if (!stack) {
      return false
    }
    return isBlockItem(stack.itemId)
  }

  public isEmpty(): boolean {
    return this.slots.every((slot) => slot === null)
  }

  public serialize(): { slots: (ItemStack | null)[]; selectedHotbar: number } {
    return {
      slots: this.slots.map((slot) => (slot ? { itemId: slot.itemId, count: slot.count } : null)),
      selectedHotbar: this.selectedHotbar,
    }
  }
}
