export function LoadingState({
  loading,
  error,
}: {
  loading: boolean
  error: string | null
}) {
  if (loading) return <div className="panel">読み込み中...</div>
  if (error) return <div className="alert">{error}</div>
  return null
}
