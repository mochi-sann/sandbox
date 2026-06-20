import { useEffect, useState } from 'react'
import { useGameStore } from '../store'
import { hasSave, loadSave } from '../save/db'
import type { SaveData } from '../save/saveSchema'

export function Menu() {
  const startGame = useGameStore((state) => state.startGame)
  const [saveExists, setSaveExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveData, setSaveData] = useState<SaveData | null>(null)

  useEffect(() => {
    void (async () => {
      const exists = await hasSave()
      setSaveExists(exists)
      if (exists) {
        const data = await loadSave()
        setSaveData(data)
      }
      setLoading(false)
    })()
  }, [])

  const handleNew = (): void => startGame(null)
  const handleContinue = (): void => startGame(saveData)

  return (
    <div className="menu-shell">
      <div className="menu-panel">
        <h1 className="menu-title">mc-test</h1>
        <p className="menu-subtitle">Minecraft風ボクセルゲーム</p>
        {loading ? (
          <div className="menu-loading">読み込み中...</div>
        ) : (
          <div className="menu-buttons">
            {saveExists ? (
              <button type="button" className="menu-button primary" onClick={handleContinue}>
                続きから
              </button>
            ) : null}
            <button type="button" className="menu-button" onClick={handleNew}>
              新規ワールド
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
