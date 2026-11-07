import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api } from './http'
import { clearSession, readSession, saveSession, type Session } from './session'
import type { Role } from './types'

interface AuthValue {
  session: Session | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession)

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<{ token: string; role: Role; fullName: string }>('/auth/login', { method: 'POST', json: { email, password } })
    const s = { token: r.token, role: r.role, fullName: r.fullName }
    saveSession(s)
    setSession(s)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const location = useLocation()
  return session ? <>{children}</> : <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
}
