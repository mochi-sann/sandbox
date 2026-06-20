import type { BlockId } from '../types'
import type { ItemId } from './items'

export interface BlockDefinition {
  id: Exclude<BlockId, 0>
  name: string
  color: [number, number, number]
  solid: boolean
  dropItem: ItemId
}

const definitions: Record<Exclude<BlockId, 0>, BlockDefinition> = {
  1: { id: 1, name: 'grass', color: [0.40, 0.72, 0.23], solid: true, dropItem: 2 },
  2: { id: 2, name: 'dirt', color: [0.48, 0.32, 0.18], solid: true, dropItem: 2 },
  3: { id: 3, name: 'stone', color: [0.48, 0.48, 0.52], solid: true, dropItem: 3 },
  4: { id: 4, name: 'sand', color: [0.82, 0.76, 0.52], solid: true, dropItem: 4 },
  5: { id: 5, name: 'wood', color: [0.45, 0.32, 0.18], solid: true, dropItem: 5 },
  6: { id: 6, name: 'leaves', color: [0.20, 0.50, 0.18], solid: true, dropItem: 6 },
  7: { id: 7, name: 'coal_ore', color: [0.22, 0.22, 0.24], solid: true, dropItem: 7 },
  8: { id: 8, name: 'planks', color: [0.62, 0.46, 0.22], solid: true, dropItem: 8 },
}

export const getBlockDefinition = (id: BlockId): BlockDefinition | null => {
  if (id === 0) {
    return null
  }
  return definitions[id]
}

export const getBlockColor = (id: BlockId): [number, number, number] => {
  const def = getBlockDefinition(id)
  return def ? def.color : [0, 0, 0]
}

export const isSolidBlock = (id: BlockId): boolean => {
  const def = getBlockDefinition(id)
  return def ? def.solid : false
}

export const getBlockDropItem = (id: BlockId): ItemId | null => {
  const def = getBlockDefinition(id)
  return def ? def.dropItem : null
}

export const PLACEABLE_BLOCK_IDS: ReadonlyArray<Exclude<BlockId, 0>> = [1, 2, 3, 4, 5, 6, 7, 8]
