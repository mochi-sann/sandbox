import { useEffect, useState } from 'react'
import { useGameStore, TOTAL_SLOTS, HOTBAR_SIZE, CRAFTING_GRID_SIZE } from '../store'
import { SlotView } from '../ui/SlotView'

export function InventoryUI() {
  const open = useGameStore((state) => state.inventoryOpen)
  const fullSlotsSnapshot = useGameStore((state) => state.fullSlotsSnapshot)
  const craftingSnapshot = useGameStore((state) => state.craftingSnapshot)
  const craftingResult = useGameStore((state) => state.craftingResult)
  const heldStack = useGameStore((state) => state.heldStack)
  const pickupOrPlace = useGameStore((state) => state.pickupOrPlace)
  const pickupOrPlaceCrafting = useGameStore((state) => state.pickupOrPlaceCrafting)
  const takeCraftingResult = useGameStore((state) => state.takeCraftingResult)
  const exitToMenu = useGameStore((state) => state.exitToMenu)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!open) {
      return
    }
    const onMouseMove = (event: MouseEvent): void => {
      setMousePos({ x: event.clientX, y: event.clientY })
    }
    window.addEventListener('mousemove', onMouseMove)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [open])

  if (!open) {
    return null
  }

  const mainSlots = fullSlotsSnapshot.slice(HOTBAR_SIZE, TOTAL_SLOTS)
  const hotbarSlots = fullSlotsSnapshot.slice(0, HOTBAR_SIZE)

  return (
    <div className="inventory-overlay">
      <div className="inventory-panel">
        <div className="inventory-title">インベントリ &amp; クラフト</div>

        <button type="button" className="menu-back-button" onClick={exitToMenu}>
          メニューに戻る
        </button>

        <div className="crafting-row">
          <div className="crafting-grid">
            {Array.from({ length: CRAFTING_GRID_SIZE }, (_, i) => (
              <SlotView
                key={i}
                slot={craftingSnapshot[i] ?? null}
                onClick={() => pickupOrPlaceCrafting(i)}
              />
            ))}
          </div>
          <div className="crafting-arrow">&rarr;</div>
          <SlotView slot={craftingResult} onClick={() => takeCraftingResult()} />
        </div>

        <div className="inventory-grid">
          {mainSlots.map((slot, i) => (
            <SlotView
              key={i}
              slot={slot}
              onClick={() => pickupOrPlace(HOTBAR_SIZE + i)}
            />
          ))}
        </div>
        <div className="inventory-grid">
          {hotbarSlots.map((slot, i) => (
            <SlotView
              key={i}
              slot={slot}
              onClick={() => pickupOrPlace(i)}
            />
          ))}
        </div>
      </div>
      {heldStack ? (
        <div className="held-stack" style={{ left: mousePos.x, top: mousePos.y }}>
          <SlotView slot={heldStack} size={40} />
        </div>
      ) : null}
    </div>
  )
}
