import { useEffect, useState } from 'react'
import type { DependencyList } from 'react'

export function useAsync<T>(load: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      setData(await load())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, deps)

  return { data, error, loading, refresh }
}
