import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { site } from '../lib/site'
import { api } from '../lib/http'
import { Field, inputClass } from './Field'
import { Icon } from './icons'

const workTypes = [...site.services.map((s) => s.title), 'Autre']

/** Formulaire public : « QUOTE » = demande de devis (avec type de travaux et adresse), « CONTACT » = simple message. */
export default function RequestForm({ kind }: { kind: 'QUOTE' | 'CONTACT' }) {
  const quote = kind === 'QUOTE'
  const [params] = useSearchParams()
  const preset = params.get('travaux') ?? ''
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', workType: workTypes.includes(preset) ? preset : '', siteAddress: '', message: '', website: '' })
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
    return (
      <div role="status" className="rounded-xl border border-wire-green/30 bg-[#effaf3] p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-wire-green text-white"><Icon name="check" size={28} strokeWidth={2.4} /></span>
        <p className="mt-4 text-2xl font-bold text-ink">Merci, votre {quote ? 'demande' : 'message'} a bien été envoyé{quote ? 'e' : ''}.</p>
        <p className="mt-1 text-ink/70">Nous vous répondons rapidement{quote ? ' pour convenir d’une visite ou vous remettre votre devis' : ''}.</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="relative grid gap-5 rounded-xl border border-line bg-white p-6 shadow-lift sm:grid-cols-2 sm:p-8">
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
        <button type="submit" disabled={state === 'sending'} className="flex w-full items-center justify-center gap-2 rounded-md bg-volt px-6 py-3.5 font-bold text-ink transition hover:brightness-95 disabled:opacity-60 sm:w-auto">
          {state === 'sending' ? 'Envoi en cours…' : <>{quote ? 'Envoyer ma demande de devis' : 'Envoyer le message'} <Icon name="arrow" size={18} /></>}
        </button>
        <p className="mt-3 text-xs text-ink/50">Vos coordonnées servent uniquement à vous répondre.</p>
      </div>
    </form>
  )
}
