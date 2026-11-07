import { clearSession, readSession } from './session'

/** Racine de l'API. En développement : /api (redirigé par Vite). En production : définir VITE_API_URL. */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

interface Options extends Omit<RequestInit, 'body'> { json?: unknown }

export async function api<T = void>(path: string, { json, headers, ...init }: Options = {}): Promise<T> {
  const token = readSession()?.token
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    })
  } catch {
    throw new Error('Serveur injoignable. Vérifiez votre connexion.')
  }

  if (res.status === 401 && token) { // session expirée
    clearSession()
    window.location.assign('/admin/login')
    throw new Error('Session expirée, reconnectez-vous.')
  }
  if (!res.ok) {
    let message = `Erreur ${res.status}`
    try { message = ((await res.json()) as { message?: string }).message ?? message } catch { /* corps vide */ }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
