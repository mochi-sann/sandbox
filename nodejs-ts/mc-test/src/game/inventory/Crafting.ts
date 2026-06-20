import type { ItemId } from '../registry/items'
import { RECIPES } from '../registry/recipes'
import type { ItemStack } from './Inventory'

const collectGridItems = (grid: (ItemStack | null)[]): Map<ItemId, number> => {
  const items = new Map<ItemId, number>()
  for (const slot of grid) {
    if (slot) {
      items.set(slot.itemId, (items.get(slot.itemId) ?? 0) + slot.count)
    }
  }
  return items
}

export const matchRecipe = (grid: (ItemStack | null)[]): ItemStack | null => {
  const gridItems = collectGridItems(grid)
  if (gridItems.size === 0) {
    return null
  }

  let gridTotal = 0
  gridItems.forEach((c) => {
    gridTotal += c
  })

  for (const recipe of RECIPES) {
    let recipeTotal = 0
    let ok = true
    for (const input of recipe.inputs) {
      if ((gridItems.get(input.itemId) ?? 0) < input.count) {
        ok = false
        break
      }
      recipeTotal += input.count
    }
    if (ok && gridTotal === recipeTotal) {
      return { itemId: recipe.output.itemId, count: recipe.output.count }
    }
  }

  return null
}
