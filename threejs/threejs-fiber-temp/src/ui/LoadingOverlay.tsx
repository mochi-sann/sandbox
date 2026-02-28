import { useProgress } from '@react-three/drei'

export function LoadingOverlay() {
  const { active, progress, item, loaded, total, errors } = useProgress()

  if (!active && errors.length === 0) {
    return null
  }

  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      {errors.length > 0 ? (
        <>
          <p className="loading-title">アセット読み込みに失敗しました</p>
          <p className="loading-meta">{errors[0].message}</p>
        </>
      ) : (
        <>
          <p className="loading-title">Loading 3D Assets...</p>
          <p className="loading-meta">
            {Math.round(progress)}% ({loaded}/{total})
          </p>
          {item ? <p className="loading-meta">{item}</p> : null}
        </>
      )}
    </div>
  )
}
