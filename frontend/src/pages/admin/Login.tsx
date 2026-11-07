import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Field, inputClass } from '../../components/Field'
import { Icon } from '../../components/icons'
import { Button, ErrorBanner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { usePublicCompany } from '../../lib/publicCompany'

export default function Login() {
  const { session, login } = useAuth()
  const { name: companyName } = usePublicCompany()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/admin" replace />

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate((location.state as { from?: string } | null)?.from ?? '/admin', { replace: true })
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-volt text-ink"><Icon name="bolt" size={26} strokeWidth={2.2} /></span>
        <p className="font-display text-4xl font-bold text-white">{companyName}</p>
      </div>
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl border-t-4 border-volt bg-white p-7 shadow-2xl">
        <div>
          <h1 className="text-3xl font-bold">Espace professionnel</h1>
          <p className="mt-1 text-sm text-ink/60">Chantiers, équipe, matériel et factures.</p>
        </div>
        <ErrorBanner message={error} />
        <Field label="E-mail" htmlFor="l-email"><input id="l-email" type="email" required autoComplete="username" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Mot de passe" htmlFor="l-pass">
          <div className="relative">
            <input id="l-pass" type={show ? 'text' : 'password'} required autoComplete="current-password" className={`${inputClass} pr-11`} value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-ink/50 hover:text-ink">
              <Icon name={show ? 'eyeOff' : 'eye'} size={17} />
            </button>
          </div>
        </Field>
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Connexion…' : 'Se connecter'}</Button>
      </form>
      <Link to="/" className="mt-6 text-sm text-white/60 hover:text-white">Retour au site</Link>
    </div>
  )
}
