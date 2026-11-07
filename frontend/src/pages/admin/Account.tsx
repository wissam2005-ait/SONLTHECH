import { useState, type FormEvent } from 'react'
import { Field, inputClass } from '../../components/Field'
import { Button, ErrorBanner, PageHeader, Section, useToast } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/http'
import { roleLabels } from '../../lib/types'

/** Chaque personne connectée change ici son propre mot de passe. */
export default function Account() {
  const { session } = useAuth()
  const toast = useToast()
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError('')
    if (f.newPassword !== f.confirm) { setError('Les deux nouveaux mots de passe ne sont pas identiques.'); return }
    setBusy(true)
    try {
      await api('/auth/password', { method: 'POST', json: { currentPassword: f.currentPassword, newPassword: f.newPassword } })
      setF({ currentPassword: '', newPassword: '', confirm: '' })
      toast('Mot de passe modifié')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Mon compte" subtitle={session && `${session.fullName}, ${roleLabels[session.role].toLowerCase()}`} />
      <Section title="Changer mon mot de passe">
        <form onSubmit={onSubmit} className="space-y-4">
          <ErrorBanner message={error} />
          <Field label="Mot de passe actuel" htmlFor="a-cur"><input id="a-cur" type="password" required autoComplete="current-password" className={inputClass} value={f.currentPassword} onChange={(e) => setF((x) => ({ ...x, currentPassword: e.target.value }))} /></Field>
          <Field label="Nouveau mot de passe" htmlFor="a-new" hint="10 caractères minimum. Évitez un mot de passe utilisé ailleurs.">
            <input id="a-new" type="password" required minLength={10} maxLength={72} autoComplete="new-password" className={inputClass} value={f.newPassword} onChange={(e) => setF((x) => ({ ...x, newPassword: e.target.value }))} />
          </Field>
          <Field label="Confirmer le nouveau mot de passe" htmlFor="a-conf"><input id="a-conf" type="password" required minLength={10} maxLength={72} autoComplete="new-password" className={inputClass} value={f.confirm} onChange={(e) => setF((x) => ({ ...x, confirm: e.target.value }))} /></Field>
          <Button type="submit" disabled={busy}>Changer le mot de passe</Button>
        </form>
      </Section>
    </div>
  )
}
