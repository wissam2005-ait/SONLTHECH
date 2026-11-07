import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/http'
import { parseNum } from '../lib/format'
import { projectStatusLabels, type Client, type Project, type ProjectStatus } from '../lib/types'
import { Field, inputClass } from './Field'
import { Button, ErrorBanner, Modal } from './ui'

const empty = { name: '', clientId: '', address: '', description: '', startDate: '', endDate: '', budget: '', status: 'TO_PLAN' as ProjectStatus }

export default function ProjectForm({ open, project, clients, onClose, onSaved }:
  { open: boolean; project: Project | null; clients: Client[]; onClose: () => void; onSaved: (p: Project) => void }) {
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(project ? {
      name: project.name, clientId: String(project.clientId), address: project.address ?? '', description: project.description ?? '',
      startDate: project.startDate ?? '', endDate: project.endDate ?? '', budget: project.budget != null ? String(project.budget) : '', status: project.status,
    } : empty)
  }, [open, project])

  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const budget = form.budget.trim() === '' ? null : parseNum(form.budget)
    if (budget !== null && !(budget >= 0)) { setError('Budget invalide.'); return }
    setError('')
    setBusy(true)
    try {
      const json = {
        name: form.name, clientId: Number(form.clientId), address: form.address, description: form.description,
        startDate: form.startDate || null, endDate: form.endDate || null, budget, status: form.status,
      }
      const saved = await api<Project>(project ? `/projects/${project.id}` : '/projects', { method: project ? 'PUT' : 'POST', json })
      onSaved(saved)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} wide title={project ? 'Modifier le chantier' : 'Nouveau chantier'}
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button type="submit" form="project-form" disabled={busy}>{project ? 'Enregistrer' : 'Créer le chantier'}</Button></>}>
      <form id="project-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><ErrorBanner message={error} /></div>
        <Field label="Nom du chantier" htmlFor="p-name"><input id="p-name" required maxLength={200} className={inputClass} placeholder="Rénovation appartement Dupont" value={form.name} onChange={set('name')} /></Field>
        <Field label="Client" htmlFor="p-client" hint={clients.length === 0 ? 'Créez d’abord un client dans la page Clients.' : undefined}>
          <select id="p-client" required className={inputClass} value={form.clientId} onChange={set('clientId')}>
            <option value="">Choisir…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Adresse du chantier" htmlFor="p-address" className="sm:col-span-2"><input id="p-address" maxLength={300} className={inputClass} value={form.address} onChange={set('address')} /></Field>
        <Field label="Début prévu" htmlFor="p-start"><input id="p-start" type="date" className={inputClass} value={form.startDate} onChange={set('startDate')} /></Field>
        <Field label="Fin prévue" htmlFor="p-end"><input id="p-end" type="date" min={form.startDate || undefined} className={inputClass} value={form.endDate} onChange={set('endDate')} /></Field>
        <Field label="Budget prévisionnel (DA)" htmlFor="p-budget"><input id="p-budget" inputMode="decimal" className={inputClass} value={form.budget} onChange={set('budget')} /></Field>
        <Field label="Statut" htmlFor="p-status">
          <select id="p-status" className={inputClass} value={form.status} onChange={set('status')}>
            {(Object.keys(projectStatusLabels) as ProjectStatus[]).map((s) => <option key={s} value={s}>{projectStatusLabels[s]}</option>)}
          </select>
        </Field>
        <Field label="Description des travaux" htmlFor="p-desc" className="sm:col-span-2"><textarea id="p-desc" rows={4} maxLength={5000} className={inputClass} value={form.description} onChange={set('description')} /></Field>
      </form>
    </Modal>
  )
}

export const projectTone = (s: ProjectStatus) => (s === 'DONE' ? 'green' : s === 'IN_PROGRESS' ? 'blue' : s === 'SUSPENDED' ? 'amber' : 'neutral') as 'green' | 'blue' | 'amber' | 'neutral'
