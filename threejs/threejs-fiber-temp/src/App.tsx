import './App.css'
import { defaultApp3DConfig } from './app/config'
import { useSceneStore } from './state/sceneStore'
import { SceneCanvas } from './three/core/SceneCanvas'
import { sceneModules } from './three/scenes/sceneModules'

function App() {
  const activeSceneId = useSceneStore((state) => state.activeSceneId)
  const debug = useSceneStore((state) => state.debug)
  const qualityProfile = useSceneStore((state) => state.qualityProfile)
  const adaptiveQuality = useSceneStore((state) => state.adaptiveQuality)
  const setActiveScene = useSceneStore((state) => state.setActiveScene)
  const toggleDebug = useSceneStore((state) => state.toggleDebug)
  const setQualityProfile = useSceneStore((state) => state.setQualityProfile)
  const setAdaptiveQuality = useSceneStore((state) => state.setAdaptiveQuality)

  const activeScene =
    sceneModules.find((scene) => scene.id === activeSceneId) ?? sceneModules[0]

  const config = {
    ...defaultApp3DConfig,
    debug,
    qualityProfile,
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">React Three Fiber Boilerplate</p>
          <h1>{activeScene.title}</h1>
          <p className="scene-description">{activeScene.description}</p>
        </div>

        <div className="toolbar">
          <label className="toggle-row">
            <span>Debug</span>
            <input type="checkbox" checked={debug} onChange={toggleDebug} />
          </label>

          <label className="toggle-row">
            <span>Adaptive Quality</span>
            <input
              type="checkbox"
              checked={adaptiveQuality}
              onChange={(event) => setAdaptiveQuality(event.target.checked)}
            />
          </label>

          <label className="select-row">
            <span>Quality</span>
            <select
              value={qualityProfile}
              onChange={(event) =>
                setQualityProfile(event.target.value as typeof qualityProfile)
              }
              disabled={adaptiveQuality}
            >
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </label>
        </div>
      </header>

      <nav className="scene-nav" aria-label="scene switcher">
        {sceneModules.map((scene) => (
          <button
            key={scene.id}
            type="button"
            className={scene.id === activeScene.id ? 'active' : ''}
            onClick={() => setActiveScene(scene.id)}
          >
            {scene.title}
          </button>
        ))}
      </nav>

      <SceneCanvas SceneComponent={activeScene.Component} config={config} />
    </main>
  )
}

export default App
