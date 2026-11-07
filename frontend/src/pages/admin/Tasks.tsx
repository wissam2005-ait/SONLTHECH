import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Field, inputClass } from '../../components/Field'
import { Badge, Button, EmptyState, ErrorBanner, FilterPills, IconButton, Loading, Modal, PageHeader, useToast } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { dateFr, todayIso } from '../../lib/format'
import { api } from '../../lib/http'
import { taskStatusLabels, type Project, type Task, type TaskStatus, type UserAccount } from '../../lib/types'

const empty = { projectId: '', assigneeId: '', title: '', description: '', dueDate: '' }
type Filter = 'open' | TaskStatus | 'late' | 'all'

export default function Tasks() {
  const { session } = useAuth()
  const isAdmin = session?.role === 'ADMIN'
  const toast = useToast()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<UserAccount[]>([])
  const [filter, setFilter] = useState<Filter>('open')
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<Task | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const load = useCallback(() => {
    api<Task[]>(isAdmin ? '/tasks' : '/tasks/mine').then(setTasks).catch((e: Error) => setError(e.message))
  }, [isAdmin])
  useEffect(() => {
    load()
    api<Project[]>('/projects').then(setProjects).catch((e: Error) => setError(e.message))
    if (isAdmin) api<UserAccount[]>('/users').then(setUsers).catch((e: Error) => setError(e.message))
  }, [load, isAdmin])

  const today = todayIso()
  const list = tasks ?? []
  const isLateTask = (t: Task) => t.status !== 'DONE' && t.dueDate !== null && t.dueDate < today
  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? `Chantier n°${id}`
  const userName = (id: number) => users.find((u) => u.id === id)?.fullName ?? ''
  const selectedProject = projects.find((p) => p.id === Number(form.projectId))
  const assignable = users.filter((u) => u.active && selectedProject?.memberIds.includes(u.id))

  const shown = useMemo(() => list.filter((t) =>
    filter === 'all' ? true : filter === 'open' ? t.status !== 'DONE' : filter === 'late' ? isLateTask(t) : t.status === filter,
  ), [list, filter])

  // Regroupées par chantier : c'est ainsi qu'on les lit sur le terrain
  const groups = useMemo(() => {
    const m = new Map<number, Task[]>()
    shown.forEach((t) => m.set(t.projectId, [...(m.get(t.projectId) ?? []), t]))
    return [...m.entries()]
  }, [shown])

  function openForm(t: Task | null) {
    setEditing(t); setFormError('')
    setForm(t ? { projectId: String(t.projectId), assigneeId: String(t.assigneeId), title: t.title, description: t.description ?? '', dueDate: t.dueDate ?? '' } : empty)
    setOpen(true)
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setFormError('')
    try {
      const json = { projectId: Number(form.projectId), assigneeId: Number(form.assigneeId), title: form.title, description: form.description, dueDate: form.dueDate || null }
      await api(editing ? `/tasks/${editing.id}` : '/tasks', { method: editing ? 'PUT' : 'POST', json })
      toast(editing ? 'Tâche enregistrée' : 'Tâche créée')
      setOpen(false)
      load()
    } catch (e) { setFormError((e as Error).message) }
  }

  async function changeStatus(t: Task, status: TaskStatus) {
    try { await api(`/tasks/${t.id}/status`, { method: 'PATCH', json: { status } }); if (status === 'DONE') toast('Tâche terminée'); load() } catch (e) { setError((e as Error).message) }
  }

  async function remove(t: Task) {
    if (!window.confirm(`Supprimer la tâche « ${t.title} » ?`)) return
    try { await api(`/tasks/${t.id}`, { method: 'DELETE' }); toast('Tâche supprimée'); load() } catch (e) { setError((e as Error).message) }
  }

  return (
    <div>
      <PageHeader title={isAdmin ? 'Tâches' : 'Mes tâches'} subtitle={isAdmin ? 'Qui fait quoi, sur quel chantier, pour quand.' : 'Les tâches qui vous sont attribuées.'}
        actions={isAdmin && <Button icon="plus" onClick={() => openForm(null)}>Nouvelle tâche</Button>} />
      <ErrorBanner message={error} onClose={() => setError('')} />

      <div className="mb-5">
        <FilterPills<Filter> value={filter} onChange={setFilter} options={[
          { id: 'open', label: 'À faire et en cours', count: list.filter((t) => t.status !== 'DONE').length },
          { id: 'late', label: 'En retard', count: list.filter(isLateTask).length },
          { id: 'DONE', label: 'Terminées', count: list.filter((t) => t.status === 'DONE').length },
          { id: 'all', label: 'Toutes', count: list.length },
        ]} />
      </div>

      {tasks === null ? <Loading /> : shown.length === 0 ? (
        <EmptyState icon="tasks" title={list.length === 0 ? 'Aucune tâche' : 'Rien ici'}
          text={list.length === 0 ? (isAdmin ? 'Créez des tâches et attribuez-les aux personnes affectées à chaque chantier.' : 'Aucune tâche ne vous est attribuée pour le moment.') : 'Tout est à jour dans ce filtre.'}
          action={isAdmin && list.length === 0 && <Button icon="plus" onClick={() => openForm(null)}>Nouvelle tâche</Button>} />
      ) : (
        <div className="space-y-6">
          {groups.map(([pid, ts]) => (
            <section key={pid}>
              <h2 className="mb-2 text-lg font-bold"><Link to={`/admin/chantiers/${pid}`} className="hover:underline">{projectName(pid)}</Link></h2>
              <ul className="overflow-hidden rounded-lg border border-line bg-white shadow-lift">
                {ts.map((t) => {
                  const late = isLateTask(t)
                  const done = t.status === 'DONE'
                  return (
                    <li key={t.id} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                      <button type="button" onClick={() => changeStatus(t, done ? 'TODO' : 'DONE')} aria-label={done ? `Rouvrir ${t.title}` : `Marquer ${t.title} comme terminée`}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors ${done ? 'border-wire-green bg-wire-green text-white' : 'border-ink/30 hover:border-ink'}`}>
                        {done && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M5 12.5 10 17l9-10" /></svg>}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold ${done ? 'text-ink/45 line-through' : ''}`}>{t.title}</p>
                        <p className="text-sm text-ink/55">
                          {isAdmin && userName(t.assigneeId)}
                          {t.dueDate && <span className={late ? 'font-semibold text-wire-red' : ''}>{isAdmin ? ', ' : ''}pour le {dateFr(t.dueDate)}</span>}
                        </p>
                        {t.description && <p className="mt-1 whitespace-pre-line text-sm text-ink/75">{t.description}</p>}
                      </div>
                      {late && <Badge tone="red">En retard</Badge>}
                      <select aria-label={`Avancement de ${t.title}`} className="h-9 rounded-md border border-line bg-white px-2 text-sm font-semibold" value={t.status} onChange={(e) => changeStatus(t, e.target.value as TaskStatus)}>
                        {(Object.keys(taskStatusLabels) as TaskStatus[]).map((s) => <option key={s} value={s}>{taskStatusLabels[s]}</option>)}
                      </select>
                      {isAdmin && <div className="flex"><IconButton icon="edit" label={`Modifier ${t.title}`} onClick={() => openForm(t)} /><IconButton icon="trash" tone="danger" label={`Supprimer ${t.title}`} onClick={() => remove(t)} /></div>}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Modifier la tâche' : 'Nouvelle tâche'}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" form="task-page-form">{editing ? 'Enregistrer' : 'Créer la tâche'}</Button></>}>
        <form id="task-page-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><ErrorBanner message={formError} /></div>
          <Field label="Chantier" htmlFor="t-project">
            <select id="t-project" required className={inputClass} value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, assigneeId: '' }))}>
              <option value="">Choisir…</option>
              {projects.filter((p) => p.status !== 'DONE' || String(p.id) === form.projectId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Attribuée à" htmlFor="t-assignee" hint={form.projectId && assignable.length === 0 ? 'Personne n’est affecté à ce chantier : gérez l’équipe depuis sa fiche.' : 'Seules les personnes affectées au chantier.'}>
            <select id="t-assignee" required disabled={!form.projectId} className={inputClass} value={form.assigneeId} onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}>
              <option value="">Choisir…</option>
              {assignable.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </Field>
          <Field label="Tâche" htmlFor="t-title" className="sm:col-span-2"><input id="t-title" required maxLength={200} className={inputClass} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></Field>
          <Field label="Pour le" htmlFor="t-due"><input id="t-due" type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} /></Field>
          <Field label="Détails" htmlFor="t-desc" className="sm:col-span-2"><textarea id="t-desc" rows={3} maxLength={5000} className={inputClass} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field>
        </form>
      </Modal>
    </div>
  )
}
