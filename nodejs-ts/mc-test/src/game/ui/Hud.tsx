import { useGameStore } from '../store'
import { Hotbar } from './Hotbar'

export function Hud() {
  const hud = useGameStore((state) => state.hud)

  return (
    <div className="hud-root">
      <div className="crosshair" />
      <div className="hud-panel top-left">
        <div>FPS: {hud.fps}</div>
        <div>
          Pos: {hud.position[0].toFixed(1)}, {hud.position[1].toFixed(1)}, {hud.position[2].toFixed(1)}
        </div>
        <div>View: {hud.cameraMode === 'first' ? 'First' : 'Third'}</div>
      </div>
      {!hud.pointerLocked ? (
        <div className="hud-panel center-hint">クリックしてポインタをロック・開始</div>
      ) : null}
      <div className="hud-panel bottom-help">
        WASD 移動 / Space ジャンプ / Shift しゃがみ / LMB 破壊 / RMB 設置 / ホイール 選択 / E インベントリ / F5 カメラ
      </div>
      <Hotbar />
    </div>
  )
}
