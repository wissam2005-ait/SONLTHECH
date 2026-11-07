import type { Role } from './types'

export interface Session { token: string; role: Role; fullName: string }

const KEY = 'electropro.session'

// sessionStorage : la connexion disparaît à la fermeture de l'onglet.
export function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch { return null }
}
export function saveSession(s: Session) { sessionStorage.setItem(KEY, JSON.stringify(s)) }
export function clearSession() { sessionStorage.removeItem(KEY) }
