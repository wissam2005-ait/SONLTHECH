import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Field, inputClass } from '../../components/Field'
import { Icon } from '../../components/icons'
import MaterialTable from '../../components/MaterialTable'
import ProjectForm, { projectTone } from '../../components/ProjectForm'
import { Avatar, Badge, Button, EmptyState, ErrorBanner, InfoRow, Loading, Modal, PageHeader, Progress, Section, Tabs, useToast } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { dateFr, dateTimeFr, money, round2, todayIso } from '../../lib/format'
import { api } from '../../lib/http'
import {
  invoiceStatusLabels, projectStatusLabels, roleLabels, taskStatusLabels,
  type Client, type Invoice, type Material, type Project, type ProjectStatus, type ProjectUpdate, type Task, type TaskStatus, type UserAccount,
} from '../../lib/types'

type Tab = 'apercu' | 'materiel' | 'taches' | 'journal' | 'factures'

export default function ProjectDetail() {
  const { id } = useParams()
  const projectId = Number(id)
  const { session } = useAuth()
  const isAdmin = session?.role === 'ADMIN'
  const navigate = useNavigate()
  const toast = useToast()

  const [project, setProject] = useState<Project | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<UserAccount[]>([])
  const [updates, setUpdates] = useState<ProjectUpdate[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [tab, setTab] = useState<Tab>('apercu')
  const [editOpen, setEditOpen] = useState(false)
  const [progressOpen, setProgressOpen] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [error, setError] = useState('')

  const loadProject = useCallback(() => {
    api<Project>(`/projects/${projectId}`).then(setProject).catch((e: Error) => setError(e.message))
    api<ProjectUpdate[]>(`/projects/${projectId}/updates`).then(setUpdates).catch(() => undefined)
  }, [projectId])
  const loadTasks = useCallback(() => {
    api<Task[]>(isAdmin ? '/tasks' : '/tasks/mine').then((all) => setTasks(all.filter((t) => t.projectId === projectId))).catch(() => undefined)
  }, [projectId, isAdmin])

  useEffect(() => {
    loadProject(); loadTasks()
    api<Material[]>(`/materials?projectId=${projectId}`).then(setMaterials).catch(() => undefined)
    if (isAdmin) {
      api<Client[]>('/clients').then(setClients).catch(() => undefined)
      api<UserAccount[]>('/users').then(setUsers).catch(() => undefined)
      api<Invoice[]>(`/invoices?projectId=${projectId}`).then(setInvoices).catch(() => undefined)
    }
  }, [projectId, isAdmin, loadProject, loadTasks])

  useEffect(() => { if (project) setClient(clients.find((c) => c.id === project.clientId) ?? null) }, [project, clients])

  async function changeStatus(status: ProjectStatus) {
    try { setProject(await api<Project>(`/projects/${projectId}/status`, { method: 'PATCH', json: { status } })); toast('Statut mis à jour') } catch (e) { setError((e as Error).message) }
  }

  async function changeTaskStatus(t: Task, status: TaskStatus) {
    try { await api(`/tasks/${t.id}/status`, { method: 'PATCH', json: { status } }); loadTasks() } catch (e) { setError((e as Error).message) }
  }

  if (error && !project) return <ErrorBanner message={error} />
  if (!project) return <Loading />

  const team = project.memberIds.map((mid) => users.find((u) => u.id === mid)).filter((u): u is UserAccount => !!u)
  const materialCost = materials.reduce((s, m) => s + round2((m.unitCost ?? 0) * m.quantity), 0)
  const invoicedHt = invoices.filter((i) => i.status !== 'DRAFT').reduce((s, i) => s + i.totalHt, 0)
  const paidTtc = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.totalTtc, 0)
  const late = project.status !== 'DONE' && project.endDate !== null && project.endDate < todayIso()
  const openTasks = tasks.filter((t) => t.status !== 'DONE').length

  return (
    <div>
      <PageHeader back={{ to: '/admin/chantiers', label: isAdmin ? 'Chantiers' : 'Mes chantiers' }}
        title={project.name}
        subtitle={<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Badge tone={projectTone(project.status)}>{projectStatusLabels[project.status]}</Badge>
          {isAdmin && client && <span>{client.name}</span>}
          {project.address && <span className="flex items-center gap-1"><Icon name="pin" size={15} />{project.address}</span>}
          {late && <Badge tone="red">En retard</Badge>}
        </span>}
        actions={isAdmin && <>
          <Button variant="secondary" icon="edit" onClick={() => navigate(`/admin/devis?chantier=${project.id}`)}>Devis</Button>
          <Button variant="secondary" icon="invoice" onClick={() => navigate(`/admin/factures?chantier=${project.id}`)}>Facturer</Button>
          <Button icon="edit" onClick={() => setEditOpen(true)}>Modifier</Button>
        </>} />

      <ErrorBanner message={error} onClose={() => setError('')} />

      {/* Avancement : l'élément principal de la fiche */}
      <div className="mb-6 rounded-lg border border-line bg-white p-5 shadow-lift">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-[16rem] flex-1">
            <p className="mb-2 text-sm font-semibold text-ink/60">Avancement du chantier</p>
            <Progress value={project.progress} />
            <p className="mt-2 text-sm text-ink/55">
              {updates[0] ? <>Dernière mise à jour le {dateTimeFr(updates[0].createdAt)}{updates[0].authorName && ` par ${updates[0].authorName}`}{updates[0].note && ` : « ${updates[0].note} »`}</> : 'Aucune mise à jour pour l’instant.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <select aria-label="Statut du chantier" className="h-10 rounded-md border border-line bg-white px-3 text-[15px] font-semibold" value={project.status} onChange={(e) => changeStatus(e.target.value as ProjectStatus)}>
                {(Object.keys(projectStatusLabels) as ProjectStatus[]).map((s) => <option key={s} value={s}>{projectStatusLabels[s]}</option>)}
              </select>
            )}
            <Button variant="volt" icon="bolt" onClick={() => setProgressOpen(true)}>Mettre à jour l’avancement</Button>
          </div>
        </div>
      </div>

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'apercu', label: 'Aperçu' },
        { id: 'materiel', label: 'Matériel', count: materials.length },
        { id: 'taches', label: 'Tâches', count: openTasks },
        { id: 'journal', label: 'Journal', count: updates.length },
        ...(isAdmin ? [{ id: 'factures' as const, label: 'Factures', count: invoices.length }] : []),
      ]} />

      {tab === 'apercu' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Section title="Informations" className="lg:col-span-2">
            <dl>
              {isAdmin && <InfoRow label="Client">{client && <Link to="/admin/clients" className="underline">{client.name}</Link>}</InfoRow>}
              {isAdmin && client?.phone && <InfoRow label="Téléphone client"><a href={`tel:${client.phone}`} className="underline">{client.phone}</a></InfoRow>}
              <InfoRow label="Adresse">{project.address}</InfoRow>
              <InfoRow label="Début prévu">{dateFr(project.startDate)}</InfoRow>
              <InfoRow label="Fin prévue">{dateFr(project.endDate)}</InfoRow>
            </dl>
            {project.description && <p className="mt-4 whitespace-pre-line text-ink/85">{project.description}</p>}
          </Section>

          {isAdmin ? (
            <Section title="Équipe" actions={<Button size="sm" variant="secondary" icon="users" onClick={() => setTeamOpen(true)}>Gérer</Button>}>
              {team.length === 0 ? <p className="text-sm text-ink/55">Personne n’est affecté. Les personnes affectées voient le chantier, son matériel et leurs tâches.</p> : (
                <ul className="space-y-2.5">
                  {team.map((u) => (
                    <li key={u.id} className="flex items-center gap-3">
                      <Avatar name={u.fullName} />
                      <div><Link to={`/admin/employes/${u.id}`} className="font-semibold hover:underline">{u.fullName}</Link><p className="text-xs text-ink/55">{u.jobTitle || roleLabels[u.role]}</p></div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          ) : (
            <Section title="Mes tâches ici">
              {tasks.length === 0 ? <p className="text-sm text-ink/55">Aucune tâche.</p> : <p><span className="font-display text-3xl font-bold">{openTasks}</span> <span className="text-ink/60">à faire ou en cours</span></p>}
            </Section>
          )}

          {isAdmin && (
            <Section title="Finances du chantier" className="lg:col-span-3">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Money label="Budget prévu" value={project.budget} />
                <Money label="Matériel acheté" value={materialCost} hint={materials.some((m) => !m.purchasedOn) ? `${materials.filter((m) => !m.purchasedOn).length} ligne(s) encore à acheter` : undefined} />
                <Money label="Facturé" value={invoicedHt} hint={paidTtc > 0 ? `${money(paidTtc)} encaissés` : undefined} />
                <Money label="Écart facturé − matériel" value={invoicedHt - materialCost} tone={invoicedHt - materialCost >= 0 ? 'green' : 'red'} hint="Hors main-d’œuvre et salaires" />
              </div>
              {project.budget != null && project.budget > 0 && (
                <div className="mt-5">
                  <p className="mb-1.5 text-sm text-ink/60">Matériel par rapport au budget</p>
                  <div className="relative h-3 overflow-hidden rounded-sm bg-ink/[.08]">
                    <div className={`h-full ${materialCost > project.budget ? 'bg-wire-red' : 'bg-wire-blue'}`} style={{ width: `${Math.min(100, (materialCost / project.budget) * 100)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-ink/55">{Math.round((materialCost / project.budget) * 100)} % du budget consommé par le matériel{materialCost > project.budget && ' — dépassement'}</p>
                </div>
              )}
            </Section>
          )}
        </div>
      )}

      {tab === 'materiel' && <MaterialTable projectId={project.id} isAdmin={isAdmin} onChange={setMaterials} />}

      {tab === 'taches' && (
        <div>
          {isAdmin && <div className="mb-4 flex justify-end"><Button icon="plus" onClick={() => setTaskOpen(true)} disabled={project.memberIds.length === 0}>Nouvelle tâche</Button></div>}
          {isAdmin && project.memberIds.length === 0 && <p className="mb-4 text-sm text-wire-amber">Affectez d’abord une équipe au chantier (onglet Aperçu) pour pouvoir lui attribuer des tâches.</p>}
          {tasks.length === 0 ? <EmptyState icon="tasks" title="Aucune tâche sur ce chantier" /> : (
            <ul className="space-y-2">
              {tasks.map((t) => {
                const lateTask = t.status !== 'DONE' && t.dueDate !== null && t.dueDate < todayIso()
                return (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 shadow-lift">
                    <div>
                      <p className={`font-semibold ${t.status === 'DONE' ? 'text-ink/45 line-through' : ''}`}>{t.title}</p>
                      <p className="text-sm text-ink/55">
                        {isAdmin && users.find((u) => u.id === t.assigneeId)?.fullName}
                        {t.dueDate && <span className={lateTask ? 'font-semibold text-wire-red' : ''}>{isAdmin ? ', ' : ''}pour le {dateFr(t.dueDate)}{lateTask && ' (en retard)'}</span>}
                      </p>
                      {t.description && <p className="mt-1 whitespace-pre-line text-sm text-ink/75">{t.description}</p>}
                    </div>
                    <select aria-label={`Avancement de ${t.title}`} className="h-9 rounded-md border border-line bg-white px-2 text-sm font-semibold" value={t.status} onChange={(e) => changeTaskStatus(t, e.target.value as TaskStatus)}>
                      {(Object.keys(taskStatusLabels) as TaskStatus[]).map((s) => <option key={s} value={s}>{taskStatusLabels[s]}</option>)}
                    </select>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'journal' && (
        updates.length === 0 ? <EmptyState icon="clock" title="Journal vide" text="Chaque mise à jour de l’avancement est enregistrée ici avec son commentaire." action={<Button variant="volt" icon="bolt" onClick={() => setProgressOpen(true)}>Mettre à jour l’avancement</Button>} /> : (
          <ol className="relative ml-3 border-l-2 border-line">
            {updates.map((u, i) => (
              <li key={u.id} className="relative mb-5 ml-6">
                <span className={`absolute -left-[33px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${i === 0 ? 'bg-volt' : 'bg-ink/30'}`} />
                <div className="rounded-lg border border-line bg-white p-4 shadow-lift">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display text-2xl font-bold tabular-nums">{u.progress}%</p>
                    <p className="text-sm text-ink/55">{dateTimeFr(u.createdAt)}{u.authorName && `, ${u.authorName}`}</p>
                  </div>
                  {u.note && <p className="mt-1 whitespace-pre-line text-ink/85">{u.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        )
      )}

      {tab === 'factures' && isAdmin && (
        <div>
          <div className="mb-4 flex justify-end"><Button icon="plus" onClick={() => navigate(`/admin/factures?chantier=${project.id}`)}>Générer une facture</Button></div>
          {invoices.length === 0 ? <EmptyState icon="invoice" title="Aucune facture pour ce chantier" /> : (
            <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-lift">
              <table className="tbl">
                <thead><tr><th>Numéro</th><th>Émise le</th><th>État</th><th className="num">Total</th></tr></thead>
                <tbody>
                  {invoices.map((i) => (
                    <tr key={i.id} className="cursor-pointer" onClick={() => navigate(`/admin/factures/${i.id}`)}>
                      <td className="font-semibold">{i.number ?? `Brouillon n°${i.id}`}</td>
                      <td>{dateFr(i.issueDate)}</td>
                      <td><Badge tone={i.status === 'PAID' ? 'green' : i.status === 'SENT' ? 'blue' : 'neutral'}>{invoiceStatusLabels[i.status]}</Badge></td>
                      <td className="num font-semibold">{money(i.totalTtc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ProjectForm open={editOpen} project={project} clients={clients} onClose={() => setEditOpen(false)} onSaved={(p) => { setProject(p); setEditOpen(false); toast('Chantier enregistré') }} />
      <ProgressModal open={progressOpen} project={project} onClose={() => setProgressOpen(false)}
        onSaved={(p) => { setProject(p); setProgressOpen(false); toast('Avancement enregistré'); loadProject() }} />
      {isAdmin && <TeamModal open={teamOpen} project={project} users={users} onClose={() => setTeamOpen(false)} onSaved={(p) => { setProject(p); setTeamOpen(false); toast('Équipe enregistrée') }} />}
      {isAdmin && <TaskModal open={taskOpen} project={project} users={team} onClose={() => setTaskOpen(false)} onSaved={() => { setTaskOpen(false); toast('Tâche créée'); loadTasks() }} />}
    </div>
  )
}

function Money({ label, value, hint, tone }: { label: string; value: number | null; hint?: string; tone?: 'green' | 'red' }) {
  return (
    <div className="rounded-md bg-panel/70 p-3">
      <p className="text-sm text-ink/60">{label}</p>
      <p className={`mt-0.5 font-display text-2xl font-bold tabular-nums ${tone === 'green' ? 'text-wire-green' : tone === 'red' ? 'text-wire-red' : ''}`}>{value == null ? '—' : money(value)}</p>
      {hint && <p className="mt-0.5 text-xs text-ink/50">{hint}</p>}
    </div>
  )
}

function ProgressModal({ open, project, onClose, onSaved }: { open: boolean; project: Project; onClose: () => void; onSaved: (p: Project) => void }) {
  const [value, setValue] = useState(project.progress)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { if (open) { setValue(project.progress); setNote(''); setError('') } }, [open, project.progress])

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    try { onSaved(await api<Project>(`/projects/${project.id}/progress`, { method: 'PATCH', json: { progress: value, note } })) } catch (e) { setError((e as Error).message) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Avancement du chantier"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button type="submit" form="progress-form">Enregistrer</Button></>}>
      <form id="progress-form" onSubmit={onSubmit} className="space-y-5">
        <ErrorBanner message={error} />
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="pg-range" className="text-sm font-semibold text-ink/85">Pourcentage réalisé</label>
            <span className="font-display text-4xl font-bold tabular-nums">{value}%</span>
          </div>
          <input id="pg-range" type="range" min={0} max={100} step={5} value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full accent-ink" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[0, 25, 50, 75, 90, 100].map((v) => (
              <button key={v} type="button" onClick={() => setValue(v)} className={`h-8 rounded-md border px-3 text-sm font-semibold ${value === v ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink/40'}`}>{v}%</button>
            ))}
          </div>
          {value === 100 && <p className="mt-2 text-sm text-wire-green">Le chantier passera en « Terminé ».</p>}
        </div>
        <Field label="Ce qui a été fait" htmlFor="pg-note" hint="Visible dans le journal du chantier.">
          <textarea id="pg-note" rows={3} maxLength={2000} className={inputClass} placeholder="Tableau posé, saignées du séjour terminées, reste la cuisine…" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </form>
    </Modal>
  )
}

function TeamModal({ open, project, users, onClose, onSaved }: { open: boolean; project: Project; users: UserAccount[]; onClose: () => void; onSaved: (p: Project) => void }) {
  const [selected, setSelected] = useState<number[]>([])
  const [error, setError] = useState('')
  const active = users.filter((u) => u.active)
  useEffect(() => { if (open) { setSelected(project.memberIds.filter((mid) => active.some((u) => u.id === mid))); setError('') } }, [open])

  async function save() {
    try { onSaved(await api<Project>(`/projects/${project.id}/members`, { method: 'PUT', json: { userIds: selected } })) } catch (e) { setError((e as Error).message) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Équipe du chantier"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button onClick={save} data-autofocus>Enregistrer l’équipe</Button></>}>
      <ErrorBanner message={error} />
      {active.length === 0 ? <p className="text-ink/60">Aucun compte actif. Ajoutez des employés d’abord.</p> : (
        <fieldset className="space-y-1">
          <legend className="sr-only">Personnes affectées</legend>
          {active.map((u) => (
            <label key={u.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-panel">
              <input type="checkbox" className="h-4 w-4 accent-ink" checked={selected.includes(u.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, u.id] : s.filter((x) => x !== u.id)))} />
              <Avatar name={u.fullName} />
              <span><span className="font-semibold">{u.fullName}</span><span className="block text-xs text-ink/55">{u.jobTitle || roleLabels[u.role]}</span></span>
            </label>
          ))}
        </fieldset>
      )}
    </Modal>
  )
}

function TaskModal({ open, project, users, onClose, onSaved }: { open: boolean; project: Project; users: UserAccount[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ title: '', assigneeId: '', dueDate: '', description: '' })
  const [error, setError] = useState('')
  useEffect(() => { if (open) { setF({ title: '', assigneeId: users.length === 1 ? String(users[0].id) : '', dueDate: '', description: '' }); setError('') } }, [open, users])

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    try {
      await api('/tasks', { method: 'POST', json: { projectId: project.id, assigneeId: Number(f.assigneeId), title: f.title, description: f.description, dueDate: f.dueDate || null } })
      onSaved()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle tâche"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button type="submit" form="task-form">Créer la tâche</Button></>}>
      <form id="task-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><ErrorBanner message={error} /></div>
        <Field label="Tâche" htmlFor="tk-title" className="sm:col-span-2"><input id="tk-title" required maxLength={200} className={inputClass} placeholder="Poser le tableau, tirer les câbles de la cuisine…" value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} /></Field>
        <Field label="Attribuée à" htmlFor="tk-user">
          <select id="tk-user" required className={inputClass} value={f.assigneeId} onChange={(e) => setF((x) => ({ ...x, assigneeId: e.target.value }))}>
            <option value="">Choisir…</option>
            {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </select>
        </Field>
        <Field label="Pour le" htmlFor="tk-due"><input id="tk-due" type="date" className={inputClass} value={f.dueDate} onChange={(e) => setF((x) => ({ ...x, dueDate: e.target.value }))} /></Field>
        <Field label="Détails" htmlFor="tk-desc" className="sm:col-span-2"><textarea id="tk-desc" rows={3} maxLength={5000} className={inputClass} value={f.description} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} /></Field>
      </form>
    </Modal>
  )
}

