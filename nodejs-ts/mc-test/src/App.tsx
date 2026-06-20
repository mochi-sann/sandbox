import './App.css'
import { useGameStore } from './game/store'
import { GameCanvas } from './game/render/GameCanvas'
import { Menu } from './game/ui/Menu'

function App() {
  const gameState = useGameStore((state) => state.gameState)
  return gameState === 'playing' ? <GameCanvas /> : <Menu />
}

export default App
