import type { ItemStack } from '../inventory/Inventory'
import type { ItemId } from './items'

export interface RecipeInput {
  itemId: ItemId
  count: number
}

export interface Recipe {
  inputs: RecipeInput[]
  output: ItemStack
}

export const RECIPES: Recipe[] = [
  { inputs: [{ itemId: 5, count: 1 }], output: { itemId: 8, count: 4 } },
  { inputs: [{ itemId: 8, count: 2 }], output: { itemId: 5, count: 1 } },
  { inputs: [{ itemId: 1, count: 1 }], output: { itemId: 2, count: 1 } },
  { inputs: [{ itemId: 3, count: 4 }], output: { itemId: 7, count: 1 } },
]
