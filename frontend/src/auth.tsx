import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getToken, setToken, type Child, type User } from './api'

type AuthState = {
  user: User | null
  children: Child[]
  child: Child | null
  loading: boolean
  setChildId: (id: number) => void
  refreshChildren: () => Promise<Child[]>
  login: (email: string, password: string) => Promise<void>
  register: (displayName: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)
const CHILD_KEY = 'caretrack.childId'

export function AuthProvider({ children: nodes }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [kids, setKids] = useState<Child[]>([])
  const [childId, setChildIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(CHILD_KEY)
    return stored ? Number(stored) : null
  })
  const [loading, setLoading] = useState(true)

  const refreshChildren = async () => {
    const list = await api.children()
    setKids(list)
    if (list.length && (childId == null || !list.some((c) => c.id === childId))) {
      setChildIdState(list[0].id)
      localStorage.setItem(CHILD_KEY, String(list[0].id))
    }
    return list
  }

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (!getToken()) {
        setLoading(false)
        return
      }
      try {
        const me = await api.me()
        if (cancelled) return
        setUser(me)
        await refreshChildren()
      } catch {
        setToken(null)
        setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  const child = kids.find((c) => c.id === childId) ?? kids[0] ?? null

  const value = useMemo<AuthState>(
    () => ({
      user,
      children: kids,
      child,
      loading,
      setChildId: (id: number) => {
        setChildIdState(id)
        localStorage.setItem(CHILD_KEY, String(id))
      },
      refreshChildren,
      login: async (email, password) => {
        const result = await api.login({ email, password })
        setToken(result.token)
        setUser(result.user)
        await refreshChildren()
      },
      register: async (displayName, email, password) => {
        const result = await api.register({ displayName, email, password })
        setToken(result.token)
        setUser(result.user)
        await refreshChildren()
      },
      logout: () => {
        setToken(null)
        setUser(null)
        setKids([])
      },
    }),
    [user, kids, child, loading],
  )

  return <AuthContext.Provider value={value}>{nodes}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('AuthProvider missing')
  return ctx
}
