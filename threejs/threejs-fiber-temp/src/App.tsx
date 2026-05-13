import './App.css'
import { Leva, useControls } from 'leva'
import type { QualityProfile } from './app/config'
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
  useControls(
    'Renderer',
    {
      Debug: {
        value: debug,
        onChange: (value: boolean) => {
          const state = useSceneStore.getState()
          if (state.debug !== value) {
            state.toggleDebug()
          }
        },
      },
      'Adaptive Quality': {
        value: adaptiveQuality,
        onChange: (value: boolean) => {
          useSceneStore.getState().setAdaptiveQuality(value)
        },
      },
      Quality: {
        options: ['high', 'medium', 'low'],
        value: qualityProfile,
        disabled: adaptiveQuality,
        onChange: (value: QualityProfile) => {
          useSceneStore.getState().setQualityProfile(value)
        },
      },
    },
    [debug, adaptiveQuality, qualityProfile],
  )

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
      <Leva
        collapsed
        oneLineLabels
        hideCopyButton
        titleBar={{ title: 'Renderer Controls', drag: false, filter: false }}
      />
    </main>
  )
}

export default App
