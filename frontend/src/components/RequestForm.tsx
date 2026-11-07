import { useState, type FormEvent } from 'react'
import { api } from '../lib/http'
import { Field, inputClass } from './Field'

const workTypes = ['Installation neuve', 'Rénovation électrique', 'Mise aux normes', 'Tableau électrique', 'Dépannage', 'Climatisation', 'Groupe électrogène', 'Éclairage', 'Autre']

/** Formulaire public : « QUOTE » = demande de devis (avec type de travaux et adresse), « CONTACT » = simple message. */
export default function RequestForm({ kind }: { kind: 'QUOTE' | 'CONTACT' }) {
  const quote = kind === 'QUOTE'
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', workType: '', siteAddress: '', message: '', website: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError('')
    setState('sending')
    try {
      await api('/public/contact-requests', { method: 'POST', json: { kind, ...form } })
      setState('done')
    } catch (e) {
      setError((e as Error).message)
      setState('idle')
    }
  }

  if (state === 'done') {
    return <p role="status" className="rounded-lg border border-green-300 bg-green-50 p-5 text-green-900">Merci, votre message a bien été envoyé. Nous vous répondons rapidement.</p>
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-ink/10 bg-white p-6 sm:grid-cols-2">
      <Field label="Nom et prénom" htmlFor="f-name"><input id="f-name" required maxLength={150} autoComplete="name" className={inputClass} value={form.fullName} onChange={set('fullName')} /></Field>
      <Field label="Téléphone" htmlFor="f-phone"><input id="f-phone" type="tel" maxLength={30} autoComplete="tel" className={inputClass} value={form.phone} onChange={set('phone')} /></Field>
      <div className="sm:col-span-2"><Field label="E-mail" htmlFor="f-email" hint="Téléphone ou e-mail : l’un des deux est obligatoire."><input id="f-email" type="email" maxLength={255} autoComplete="email" className={inputClass} value={form.email} onChange={set('email')} /></Field></div>
      {quote && (
        <>
          <Field label="Type de travaux" htmlFor="f-work">
            <select id="f-work" className={inputClass} value={form.workType} onChange={set('workType')}>
              <option value="">Choisir…</option>
              {workTypes.map((w) => <option key={w}>{w}</option>)}
            </select>
          </Field>
          <Field label="Adresse du chantier" htmlFor="f-site"><input id="f-site" maxLength={300} autoComplete="street-address" className={inputClass} value={form.siteAddress} onChange={set('siteAddress')} /></Field>
        </>
      )}
      <div className="sm:col-span-2"><Field label={quote ? 'Décrivez vos travaux' : 'Votre message'} htmlFor="f-msg"><textarea id="f-msg" required rows={5} maxLength={5000} className={inputClass} value={form.message} onChange={set('message')} /></Field></div>
      {/* Champ piège anti-robots : masqué pour les personnes */}
      <div aria-hidden="true" className="absolute -left-[9999px]"><label>Ne pas remplir<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label></div>
      {error && <p className="text-red-700 sm:col-span-2" role="alert">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={state === 'sending'} className="rounded-md bg-ink px-6 py-3 font-semibold text-white hover:bg-navy disabled:opacity-50">{state === 'sending' ? 'Envoi…' : quote ? 'Envoyer ma demande de devis' : 'Envoyer'}</button>
      </div>
    </form>
  )
}
