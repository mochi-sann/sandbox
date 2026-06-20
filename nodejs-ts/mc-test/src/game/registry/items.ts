import type { BlockId } from '../types'

export type ItemId = number

export interface ItemDefinition {
  id: ItemId
  name: string
  maxStack: number
  isBlock: boolean
  blockId?: Exclude<BlockId, 0>
}

const definitions = new Map<ItemId, ItemDefinition>()

const registerBlockItem = (blockId: Exclude<BlockId, 0>, name: string): void => {
  definitions.set(blockId, {
    id: blockId,
    name,
    maxStack: 64,
    isBlock: true,
    blockId,
  })
}

registerBlockItem(1, 'Grass')
registerBlockItem(2, 'Dirt')
registerBlockItem(3, 'Stone')
registerBlockItem(4, 'Sand')
registerBlockItem(5, 'Wood')
registerBlockItem(6, 'Leaves')
registerBlockItem(7, 'Coal Ore')
registerBlockItem(8, 'Planks')

export const getItemDefinition = (itemId: ItemId): ItemDefinition | null => {
  return definitions.get(itemId) ?? null
}

export const getMaxStack = (itemId: ItemId): number => {
  return getItemDefinition(itemId)?.maxStack ?? 1
}

export const isBlockItem = (itemId: ItemId): boolean => {
  return getItemDefinition(itemId)?.isBlock ?? false
}
