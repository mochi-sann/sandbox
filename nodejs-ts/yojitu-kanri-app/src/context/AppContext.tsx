import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { AppUser, Masters } from '../../shared/types'

type AppContextValue = {
  userId: number
  setUserId: (userId: number) => void
  currentUser: AppUser | null
  masters: Masters | null
  refreshMasters: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) throw new Error('AppContext is missing')
  return context
}

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState(1)
  const [masters, setMasters] = useState<Masters | null>(null)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function refreshMasters() {
    try {
      const [mastersResult, userResult] = await Promise.all([
        api.masters({ userId }),
        api.me({ userId }),
      ])
      setMasters(mastersResult)
      setCurrentUser(userResult)
      setLoadError(null)
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : 'APIに接続できません')
    }
  }

  useEffect(() => {
    void refreshMasters()
  }, [userId])

  const context = useMemo(
    () => ({ userId, setUserId, currentUser, masters, refreshMasters }),
    [userId, currentUser, masters],
  )

  return (
    <AppContext.Provider value={context}>
      {loadError ? <div className="alert">{loadError}</div> : children}
    </AppContext.Provider>
  )
}
