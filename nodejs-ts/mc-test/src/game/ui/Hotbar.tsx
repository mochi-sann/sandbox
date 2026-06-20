import { useGameStore, HOTBAR_SIZE } from '../store'
import { SlotView } from './SlotView'

export function Hotbar() {
  const hotbarSnapshot = useGameStore((state) => state.hotbarSnapshot)
  const selectedHotbar = useGameStore((state) => state.inventory.selectedHotbar)

  return (
    <div className="hotbar">
      {Array.from({ length: HOTBAR_SIZE }, (_, i) => (
        <SlotView
          key={i}
          slot={hotbarSnapshot[i] ?? null}
          selected={selectedHotbar === i}
        />
      ))}
    </div>
  )
}
