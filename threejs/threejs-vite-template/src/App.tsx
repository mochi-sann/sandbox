import { SceneCanvas } from './components/scene/SceneCanvas'
import { useViewport } from './hooks/useViewport'
import './styles/app.css'

function App() {
  const viewport = useViewport()

  return (
    <main className="app-root">
      <header className="app-header">
        <p className="eyebrow">React Three Fiber TypeScript Boilerplate</p>
        <h1>Production-ready 3D foundation</h1>
        <p className="lead">
          Strict TypeScript, responsive defaults, and practical performance tooling for
          scalable R3F projects.
        </p>
      </header>

      <section className="canvas-shell" aria-label="R3F preview scene">
        <SceneCanvas viewport={viewport} />
      </section>
    </main>
  )
}

export default App
