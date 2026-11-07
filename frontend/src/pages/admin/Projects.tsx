import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../components/icons'
import ProjectForm, { projectTone } from '../../components/ProjectForm'
import { Badge, Button, EmptyState, ErrorBanner, FilterPills, Loading, PageHeader, Progress, SearchInput, useToast } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { dateFr, money, initials, todayIso } from '../../lib/format'
import { api } from '../../lib/http'
import { projectStatusLabels, type Client, type Project, type ProjectStatus, type UserAccount } from '../../lib/types'

type Filter = 'ALL' | ProjectStatus

export default function Projects() {
  const { session } = useAuth()
  const isAdmin = session?.role === 'ADMIN'
  const navigate = useNavigate()
  const toast = useToast()
  const [items, setItems] = useState<Project[] | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<UserAccount[]>([])
  const [filter, setFilter] = useState<Filter>('ALL')
  const [q, setQ] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api<Project[]>('/projects').then(setItems).catch((e: Error) => setError(e.message))
  }, [])
  useEffect(() => {
    load()
    if (isAdmin) {
      api<Client[]>('/clients').then(setClients).catch((e: Error) => setError(e.message))
      api<UserAccount[]>('/users').then(setUsers).catch((e: Error) => setError(e.message))
    }
  }, [load, isAdmin])

  const list = items ?? []
  const clientName = (id: number) => clients.find((c) => c.id === id)?.name
  const today = todayIso()
  const count = (s: ProjectStatus) => list.filter((p) => p.status === s).length

  const shown = useMemo(() => list
    .filter((p) => filter === 'ALL' || p.status === filter)
    .filter((p) => !q.trim() || `${p.name} ${p.address ?? ''} ${clientName(p.clientId) ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())),
  [list, filter, q, clients])

  return (
    <div>
      <PageHeader title={isAdmin ? 'Chantiers' : 'Mes chantiers'}
        subtitle={isAdmin ? 'Suivez l’avancement, le matériel et l’équipe de chaque chantier.' : 'Les chantiers sur lesquels vous êtes affecté.'}
        actions={isAdmin && <Button icon="plus" onClick={() => setFormOpen(true)}>Nouveau chantier</Button>} />

      <ErrorBanner message={error} onClose={() => setError('')} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterPills<Filter> value={filter} onChange={setFilter} options={[
          { id: 'ALL', label: 'Tous', count: list.length },
          { id: 'IN_PROGRESS', label: 'En cours', count: count('IN_PROGRESS') },
          { id: 'TO_PLAN', label: 'À planifier', count: count('TO_PLAN') },
          { id: 'SUSPENDED', label: 'Suspendus', count: count('SUSPENDED') },
          { id: 'DONE', label: 'Terminés', count: count('DONE') },
        ]} />
        <SearchInput value={q} onChange={setQ} placeholder="Nom, adresse, client" />
      </div>

      {items === null ? <Loading /> : shown.length === 0 ? (
        <EmptyState icon="site" title={list.length === 0 ? (isAdmin ? 'Aucun chantier' : 'Aucun chantier pour vous') : 'Aucun résultat'}
          text={list.length === 0 ? (isAdmin ? 'Créez un chantier pour suivre son avancement et son matériel.' : 'Le dirigeant vous affectera à vos prochains chantiers.') : 'Modifiez le filtre ou la recherche.'}
          action={isAdmin && list.length === 0 && <Button icon="plus" onClick={() => setFormOpen(true)}>Nouveau chantier</Button>} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => {
            const late = p.status !== 'DONE' && p.endDate !== null && p.endDate < today
            const team = p.memberIds.map((id) => users.find((u) => u.id === id)).filter((u): u is UserAccount => !!u)
            return (
              <li key={p.id}>
                <Link to={`/admin/chantiers/${p.id}`} className="flex h-full flex-col rounded-lg border border-line bg-white p-5 shadow-lift transition-colors hover:border-ink/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-xl font-bold leading-tight">{p.name}</p>
                      {isAdmin && clientName(p.clientId) && <p className="mt-0.5 truncate text-sm text-ink/60">{clientName(p.clientId)}</p>}
                    </div>
                    <Badge tone={projectTone(p.status)}>{projectStatusLabels[p.status]}</Badge>
                  </div>
                  {p.address && <p className="mt-2 flex items-start gap-1.5 text-sm text-ink/60"><Icon name="pin" size={15} className="mt-0.5 shrink-0" />{p.address}</p>}
                  <div className="mt-4"><Progress value={p.progress} /></div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 text-sm">
                    <span className={`flex items-center gap-1.5 ${late ? 'font-semibold text-wire-red' : 'text-ink/55'}`}>
                      <Icon name="clock" size={15} />
                      {p.endDate ? (late ? `En retard, fin prévue le ${dateFr(p.endDate)}` : `Fin prévue le ${dateFr(p.endDate)}`) : 'Pas de date de fin'}
                    </span>
                    {isAdmin && team.length > 0 && (
                      <span className="flex -space-x-1.5" aria-label={`Équipe : ${team.map((u) => u.fullName).join(', ')}`}>
                        {team.slice(0, 4).map((u) => <span key={u.id} title={u.fullName} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-ink font-display text-[11px] font-bold text-volt">{initials(u.fullName)}</span>)}
                        {team.length > 4 && <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-ink/15 text-[11px] font-bold">+{team.length - 4}</span>}
                      </span>
                    )}
                  </div>
                  {isAdmin && p.budget != null && <p className="mt-2 text-xs text-ink/50">Budget {money(p.budget)}</p>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <ProjectForm open={formOpen} project={null} clients={clients} onClose={() => setFormOpen(false)}
        onSaved={(p) => { setFormOpen(false); toast('Chantier créé'); navigate(`/admin/chantiers/${p.id}`) }} />
    </div>
  )
}
