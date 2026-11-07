import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/http'
import { todayIso } from '../lib/format'
import { absenceColors, absenceLabels, type Absence, type AbsenceType, type UserAccount } from '../lib/types'
import { Field, inputClass } from './Field'
import { Button, ErrorBanner, Modal } from './ui'

interface Props {
  open: boolean
  absence: Absence | null          // null = nouvelle absence
  users: UserAccount[]
  defaultUserId?: number
  defaultDate?: string
  onClose: () => void
  onSaved: () => void
}

export default function AbsenceForm({ open, absence, users, defaultUserId, defaultDate, onClose, onSaved }: Props) {
  const [form, setForm] = useState({ userId: '', type: 'PAID_LEAVE' as AbsenceType, startDate: '', endDate: '', halfDay: false, note: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    const d = defaultDate ?? todayIso()
    setForm(absence
      ? { userId: String(absence.userId), type: absence.type, startDate: absence.startDate, endDate: absence.endDate, halfDay: absence.halfDay, note: absence.note ?? '' }
      : { userId: defaultUserId ? String(defaultUserId) : '', type: 'PAID_LEAVE', startDate: d, endDate: d, halfDay: false, note: '' })
  }, [open, absence, defaultUserId, defaultDate])

  const singleDay = form.startDate !== '' && form.startDate === form.endDate

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError('')
    setBusy(true)
    try {
      const json = { userId: Number(form.userId), type: form.type, startDate: form.startDate, endDate: form.endDate, halfDay: singleDay && form.halfDay, note: form.note }
      await api(absence ? `/absences/${absence.id}` : '/absences', { method: absence ? 'PUT' : 'POST', json })
      onSaved()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  async function remove() {
    if (!absence || !window.confirm('Supprimer cette absence ?')) return
    setBusy(true)
    try { await api(`/absences/${absence.id}`, { method: 'DELETE' }); onSaved() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  const selectable = users.filter((u) => u.active || String(u.id) === form.userId)

  return (
    <Modal open={open} onClose={onClose} title={absence ? 'Modifier l’absence' : 'Déclarer une absence'}
      footer={<>
        {absence && <Button variant="danger" icon="trash" onClick={remove} disabled={busy} className="mr-auto">Supprimer</Button>}
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button type="submit" form="absence-form" disabled={busy}>Enregistrer</Button>
      </>}>
      <form id="absence-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><ErrorBanner message={error} /></div>
        <Field label="Employé" htmlFor="a-user" className="sm:col-span-2">
          <select id="a-user" required className={inputClass} value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}>
            <option value="">Choisir…</option>
            {selectable.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </select>
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-sm font-semibold text-ink/85">Motif</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(absenceLabels) as AbsenceType[]).map((t) => (
              <label key={t} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${form.type === t ? 'border-ink bg-ink/[.03]' : 'border-line hover:border-ink/40'}`}>
                <input type="radio" name="a-type" className="sr-only" checked={form.type === t} onChange={() => setForm((f) => ({ ...f, type: t }))} />
                <span className="h-3 w-3 rounded-sm" style={{ background: absenceColors[t] }} />{absenceLabels[t]}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Du" htmlFor="a-start">
          <input id="a-start" type="date" required className={inputClass} value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value, endDate: f.endDate < e.target.value ? e.target.value : f.endDate }))} />
        </Field>
        <Field label="Au (inclus)" htmlFor="a-end"><input id="a-end" type="date" required min={form.startDate} className={inputClass} value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></Field>
        {singleDay && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="h-4 w-4" checked={form.halfDay} onChange={(e) => setForm((f) => ({ ...f, halfDay: e.target.checked }))} />
            Demi-journée seulement
          </label>
        )}
        <Field label="Note" htmlFor="a-note" className="sm:col-span-2"><input id="a-note" maxLength={500} className={inputClass} placeholder="Arrêt de travail reçu, RDV médical…" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></Field>
      </form>
    </Modal>
  )
}
