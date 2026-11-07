import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmployeeForm from '../../components/EmployeeForm'
import { Avatar, Badge, Button, EmptyState, ErrorBanner, FilterPills, IconButton, Loading, PageHeader, SearchInput, Stat, useToast } from '../../components/ui'
import { dateFr, money } from '../../lib/format'
import { api } from '../../lib/http'
import { contractLabels, roleLabels, type UserAccount } from '../../lib/types'

type Filter = 'active' | 'inactive' | 'all'

export default function Employees() {
  const navigate = useNavigate()
  const toast = useToast()
  const [items, setItems] = useState<UserAccount[] | null>(null)
  const [filter, setFilter] = useState<Filter>('active')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<UserAccount | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api<UserAccount[]>('/users').then(setItems).catch((e: Error) => setError(e.message))
  }, [])
  useEffect(load, [load])

  const all = items ?? []
  const shown = useMemo(() => all
    .filter((u) => filter === 'all' || (filter === 'active' ? u.active : !u.active))
    .filter((u) => !q.trim() || `${u.fullName} ${u.jobTitle ?? ''} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase())),
  [all, filter, q])

  const staff = all.filter((u) => u.active && u.role !== 'ADMIN')
  const payroll = staff.reduce((s, u) => s + (u.monthlySalary ?? 0), 0)

  async function toggleActive(u: UserAccount) {
    const action = u.active ? 'Désactiver' : 'Réactiver'
    if (!window.confirm(`${action} ${u.fullName} ?${u.active ? '\nLa personne ne pourra plus se connecter. Son historique est conservé.' : ''}`)) return
    setError('')
    try {
      await api(`/users/${u.id}/active`, { method: 'POST', json: { active: !u.active } })
      toast(u.active ? `${u.fullName} désactivé` : `${u.fullName} réactivé`)
      load()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div>
      <PageHeader title="Employés" subtitle="L’équipe, les contrats et les accès à l’application."
        actions={<Button icon="plus" onClick={() => { setEditing(null); setFormOpen(true) }}>Ajouter un employé</Button>} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Employés et stagiaires actifs" value={staff.length} />
        <Stat label="Masse salariale mensuelle" value={money(payroll)} hint="Somme des salaires mensuels renseignés" />
        <Stat label="Comptes désactivés" value={all.filter((u) => !u.active).length} />
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterPills<Filter> value={filter} onChange={setFilter} options={[
          { id: 'active', label: 'Actifs', count: all.filter((u) => u.active).length },
          { id: 'inactive', label: 'Désactivés', count: all.filter((u) => !u.active).length },
          { id: 'all', label: 'Tous', count: all.length },
        ]} />
        <SearchInput value={q} onChange={setQ} placeholder="Nom, fonction, e-mail" />
      </div>

      {items === null ? <Loading /> : shown.length === 0 ? (
        <EmptyState icon="users" title={all.length === 0 ? 'Aucun employé' : 'Aucun résultat'}
          text={all.length === 0 ? 'Ajoutez votre premier employé pour lui donner accès à ses chantiers.' : 'Modifiez le filtre ou la recherche.'}
          action={all.length === 0 && <Button icon="plus" onClick={() => { setEditing(null); setFormOpen(true) }}>Ajouter un employé</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-lift">
          <table className="tbl">
            <thead><tr><th>Nom</th><th>Contrat</th><th>Embauche</th><th className="num">Salaire mensuel</th><th>Accès</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id} className="cursor-pointer" onClick={() => navigate(`/admin/employes/${u.id}`)}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.fullName} muted={!u.active} />
                      <div>
                        <p className={`font-semibold ${u.active ? '' : 'text-ink/50'}`}>{u.fullName}</p>
                        <p className="text-xs text-ink/55">{u.jobTitle || u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>{u.contractType ? contractLabels[u.contractType] : <span className="text-ink/35">—</span>}</td>
                  <td className="whitespace-nowrap">{u.hireDate ? dateFr(u.hireDate) : <span className="text-ink/35">—</span>}</td>
                  <td className="num">{u.monthlySalary != null ? money(u.monthlySalary) : <span className="text-ink/35">—</span>}</td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={u.role === 'ADMIN' ? 'volt' : 'neutral'}>{roleLabels[u.role]}</Badge>
                      {!u.active && <Badge tone="red">Désactivé</Badge>}
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end">
                      <IconButton icon="edit" label={`Modifier ${u.fullName}`} onClick={() => { setEditing(u); setFormOpen(true) }} />
                      <IconButton icon="power" label={u.active ? `Désactiver ${u.fullName}` : `Réactiver ${u.fullName}`} tone={u.active ? 'danger' : 'default'} onClick={() => toggleActive(u)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EmployeeForm open={formOpen} user={editing} onClose={() => setFormOpen(false)}
        onSaved={(u) => { setFormOpen(false); toast(editing ? 'Employé enregistré' : 'Employé créé'); load(); if (!editing) navigate(`/admin/employes/${u.id}`) }} />
    </div>
  )
}
