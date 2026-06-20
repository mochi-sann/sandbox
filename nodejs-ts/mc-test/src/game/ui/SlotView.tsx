import { getItemDefinition } from '../registry/items'
import { getBlockColor } from '../registry/blocks'
import type { ItemStack } from '../inventory/Inventory'

interface SlotViewProps {
  slot: ItemStack | null
  size?: number
  selected?: boolean
  onClick?: () => void
}

export function SlotView({ slot, size = 48, selected, onClick }: SlotViewProps) {
  const def = slot ? getItemDefinition(slot.itemId) : null
  const rgb = def?.isBlock && def.blockId ? getBlockColor(def.blockId) : null
  const background = rgb
    ? `rgb(${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)})`
    : '#888888'

  return (
    <div
      className={`slot ${selected ? 'selected' : ''}`}
      onClick={onClick}
      style={{ width: size, height: size }}
    >
      {slot ? (
        <>
          <div className="slot-icon" style={{ width: size - 8, height: size - 8, background }} />
          {slot.count > 1 ? <span className="slot-count">{slot.count}</span> : null}
        </>
      ) : null}
    </div>
  )
}
