import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/http'
import { currentMonth, parseNum, todayIso } from '../lib/format'
import { Field, inputClass } from './Field'
import { Button, ErrorBanner, Modal } from './ui'

const methods = ['Virement bancaire', 'Virement CCP', 'Chèque', 'Espèces']

/** Enregistre un versement de salaire (acompte, solde, prime…). */
export default function PaymentForm({ open, userId, userName, month, suggested, onClose, onSaved }:
  { open: boolean; userId: number | null; userName: string; month?: string; suggested?: number; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ period: currentMonth(), amount: '', paidOn: todayIso(), method: 'Virement bancaire', note: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setForm({ period: month ?? currentMonth(), amount: suggested && suggested > 0 ? String(suggested) : '', paidOn: todayIso(), method: 'Virement bancaire', note: '' })
  }, [open, month, suggested])

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!userId) return
    const amount = parseNum(form.amount)
    if (!(amount > 0)) { setError('Montant invalide.'); return }
    setError('')
    setBusy(true)
    try {
      await api(`/salaries/${userId}/payments`, { method: 'POST', json: { ...form, amount } })
      onSaved()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Paiement — ${userName}`}
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button type="submit" form="pay-form" disabled={busy}>Enregistrer le paiement</Button></>}>
      <form id="pay-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><ErrorBanner message={error} /></div>
        <Field label="Montant (DA)" htmlFor="p-amount"><input id="p-amount" required inputMode="decimal" className={inputClass} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></Field>
        <Field label="Mois concerné" htmlFor="p-period"><input id="p-period" type="month" required className={inputClass} value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} /></Field>
        <Field label="Date du versement" htmlFor="p-date"><input id="p-date" type="date" required className={inputClass} value={form.paidOn} onChange={(e) => setForm((f) => ({ ...f, paidOn: e.target.value }))} /></Field>
        <Field label="Moyen de paiement" htmlFor="p-method">
          <select id="p-method" className={inputClass} value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>{methods.map((m) => <option key={m}>{m}</option>)}</select>
        </Field>
        <Field label="Note" htmlFor="p-note" className="sm:col-span-2"><input id="p-note" maxLength={300} className={inputClass} placeholder="Acompte, solde, prime, heures sup…" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></Field>
      </form>
    </Modal>
  )
}
