import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import AbsenceForm from '../../components/AbsenceForm'
import EmployeeForm from '../../components/EmployeeForm'
import { Field, inputClass } from '../../components/Field'
import { Icon } from '../../components/icons'
import PaymentForm from '../../components/PaymentForm'
import { Avatar, Badge, Button, EmptyState, ErrorBanner, IconButton, InfoRow, Loading, Modal, PageHeader, Progress, Section, Stat, Tabs, useToast } from '../../components/ui'
import { currentMonth, dateFr, money, monthLabel, num } from '../../lib/format'
import { api } from '../../lib/http'
import {
  absenceColors, absenceLabels, contractLabels, projectStatusLabels, roleLabels,
  type Absence, type AbsenceType, type Project, type SalaryPayment, type UserAccount,
} from '../../lib/types'

type Tab = 'infos' | 'salaire' | 'absences' | 'chantiers'

export default function EmployeeDetail() {
  const { id } = useParams()
  const userId = Number(id)
  const toast = useToast()
  const [user, setUser] = useState<UserAccount | null>(null)
  const [payments, setPayments] = useState<SalaryPayment[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tab, setTab] = useState<Tab>('infos')
  const [year, setYear] = useState(new Date().getFullYear())
  const [editOpen, setEditOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [absOpen, setAbsOpen] = useState(false)
  const [editingAbs, setEditingAbs] = useState<Absence | null>(null)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [error, setError] = useState('')

  const loadUser = useCallback(() => { api<UserAccount>(`/users/${userId}`).then(setUser).catch((e: Error) => setError(e.message)) }, [userId])
  const loadPayments = useCallback(() => { api<SalaryPayment[]>(`/salaries/${userId}/payments`).then(setPayments).catch((e: Error) => setError(e.message)) }, [userId])
  const loadAbsences = useCallback(() => { api<Absence[]>(`/absences?userId=${userId}`).then(setAbsences).catch((e: Error) => setError(e.message)) }, [userId])

  useEffect(() => {
    loadUser(); loadPayments(); loadAbsences()
    api<Project[]>('/projects').then((all) => setProjects(all.filter((p) => p.memberIds.includes(userId)))).catch(() => undefined)
  }, [userId, loadUser, loadPayments, loadAbsences])

  // Salaire : versements de l'année regroupés par mois
  const yearPayments = payments.filter((p) => p.period.startsWith(String(year)))
  const paidYear = yearPayments.reduce((s, p) => s + p.amount, 0)
  const byMonth = useMemo(() => {
    const m = new Map<string, number>()
    yearPayments.forEach((p) => m.set(p.period, (m.get(p.period) ?? 0) + p.amount))
    return m
  }, [yearPayments])
  const monthsSoFar = year < new Date().getFullYear() ? 12 : year > new Date().getFullYear() ? 0 : new Date().getMonth() + 1
  const months = Array.from({ length: monthsSoFar }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`).reverse()

  // Absences : jours de l'année par motif (approximation : absences commencées dans l'année)
  const yearAbsences = absences.filter((a) => a.startDate.startsWith(String(year)) || a.endDate.startsWith(String(year)))
  const daysByType = useMemo(() => {
    const m: Partial<Record<AbsenceType, number>> = {}
    yearAbsences.forEach((a) => { m[a.type] = (m[a.type] ?? 0) + a.days })
    return m
  }, [yearAbsences])
  const totalDays = Object.values(daysByType).reduce((s, d) => s + (d ?? 0), 0)

  async function toggleActive() {
    if (!user) return
    if (!window.confirm(user.active ? `Désactiver ${user.fullName} ? La personne ne pourra plus se connecter.` : `Réactiver ${user.fullName} ?`)) return
    try {
      setUser(await api<UserAccount>(`/users/${user.id}/active`, { method: 'POST', json: { active: !user.active } }))
      toast(user.active ? 'Compte désactivé' : 'Compte réactivé')
    } catch (e) { setError((e as Error).message) }
  }

  async function removePayment(p: SalaryPayment) {
    if (!window.confirm(`Supprimer le paiement de ${money(p.amount)} du ${dateFr(p.paidOn)} ?`)) return
    try { await api(`/salaries/payments/${p.id}`, { method: 'DELETE' }); toast('Paiement supprimé'); loadPayments() } catch (e) { setError((e as Error).message) }
  }

  if (error && !user) return <ErrorBanner message={error} />
  if (!user) return <Loading />

  return (
    <div>
      <PageHeader back={{ to: '/admin/employes', label: 'Employés' }}
        title={<span className="flex items-center gap-3"><Avatar name={user.fullName} muted={!user.active} />{user.fullName}</span>}
        subtitle={<span className="flex flex-wrap items-center gap-2">
          {user.jobTitle && <span>{user.jobTitle}</span>}
          <Badge tone={user.role === 'ADMIN' ? 'volt' : 'neutral'}>{roleLabels[user.role]}</Badge>
          {user.contractType && <Badge tone="blue">{contractLabels[user.contractType]}</Badge>}
          {!user.active && <Badge tone="red">Désactivé</Badge>}
        </span>}
        actions={<>
          <Button variant="secondary" icon="key" onClick={() => setPwdOpen(true)}>Mot de passe</Button>
          <Button variant={user.active ? 'danger' : 'secondary'} icon="power" onClick={toggleActive}>{user.active ? 'Désactiver' : 'Réactiver'}</Button>
          <Button icon="edit" onClick={() => setEditOpen(true)}>Modifier</Button>
        </>} />

      <ErrorBanner message={error} onClose={() => setError('')} />

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'infos', label: 'Informations' },
        { id: 'salaire', label: 'Salaire' },
        { id: 'absences', label: 'Absences', count: absences.length },
        { id: 'chantiers', label: 'Chantiers', count: projects.length },
      ]} />

      {tab === 'infos' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Section title="Coordonnées">
            <dl>
              <InfoRow label="E-mail"><a href={`mailto:${user.email}`} className="underline">{user.email}</a></InfoRow>
              <InfoRow label="Téléphone">{user.phone && <a href={`tel:${user.phone}`} className="underline">{user.phone}</a>}</InfoRow>
              <InfoRow label="Adresse">{user.address}</InfoRow>
            </dl>
          </Section>
          <Section title="Contrat">
            <dl>
              <InfoRow label="Type de contrat">{user.contractType && contractLabels[user.contractType]}</InfoRow>
              <InfoRow label="Date d’embauche">{dateFr(user.hireDate)}</InfoRow>
              <InfoRow label="Salaire mensuel">{user.monthlySalary != null && money(user.monthlySalary)}</InfoRow>
              <InfoRow label="Accès">{roleLabels[user.role]}</InfoRow>
            </dl>
          </Section>
          {user.notes && <Section title="Notes internes" className="lg:col-span-2"><p className="whitespace-pre-line">{user.notes}</p></Section>}
        </div>
      )}

      {tab === 'salaire' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <YearPicker year={year} onChange={setYear} />
            <Button icon="plus" onClick={() => setPayOpen(true)} disabled={!user.active}>Enregistrer un paiement</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Salaire mensuel convenu" value={user.monthlySalary != null ? money(user.monthlySalary) : '—'} hint={user.monthlySalary == null ? 'À renseigner dans « Modifier »' : undefined} />
            <Stat label={`Versé en ${year}`} value={money(paidYear)} />
            <Stat label="Mois payés" value={`${months.filter((m) => (byMonth.get(m) ?? 0) >= (user.monthlySalary ?? Infinity)).length} / ${months.length}`} />
          </div>
          <Section title={`Mois par mois — ${year}`}>
            {months.length === 0 ? <p className="text-ink/55">Aucun mois écoulé.</p> : (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead><tr><th>Mois</th><th className="num">Dû</th><th className="num">Versé</th><th className="num">Reste</th><th>État</th></tr></thead>
                  <tbody>
                    {months.map((m) => {
                      const due = user.monthlySalary ?? 0
                      const paid = byMonth.get(m) ?? 0
                      const rest = due - paid
                      return (
                        <tr key={m}>
                          <td className="font-medium">{monthLabel(m)}</td>
                          <td className="num">{money(due)}</td>
                          <td className="num">{money(paid)}</td>
                          <td className="num">{rest > 0 ? money(rest) : '—'}</td>
                          <td>{due === 0 ? <Badge>Salaire non renseigné</Badge> : rest <= 0 ? <Badge tone="green" dot>Payé</Badge> : paid > 0 ? <Badge tone="amber" dot>Partiel</Badge> : <Badge tone="red" dot>À payer</Badge>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
          <Section title="Historique des versements">
            {payments.length === 0 ? <p className="text-ink/55">Aucun versement enregistré.</p> : (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead><tr><th>Date</th><th>Mois</th><th className="num">Montant</th><th>Moyen</th><th>Note</th><th /></tr></thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{dateFr(p.paidOn)}</td><td>{monthLabel(p.period)}</td><td className="num font-semibold">{money(p.amount)}</td>
                        <td>{p.method}</td><td className="text-ink/70">{p.note}</td>
                        <td className="text-right"><IconButton icon="trash" tone="danger" label="Supprimer ce paiement" onClick={() => removePayment(p)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      )}

      {tab === 'absences' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <YearPicker year={year} onChange={setYear} />
            <Button icon="plus" onClick={() => { setEditingAbs(null); setAbsOpen(true) }}>Déclarer une absence</Button>
          </div>
          <Section title={`Bilan ${year}`}>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <div><p className="text-sm text-ink/55">Total</p><p className="font-display text-3xl font-bold tabular-nums">{num(totalDays)} j</p></div>
              {(Object.keys(absenceLabels) as AbsenceType[]).filter((t) => daysByType[t]).map((t) => (
                <div key={t}>
                  <p className="flex items-center gap-1.5 text-sm text-ink/55"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: absenceColors[t] }} />{absenceLabels[t]}</p>
                  <p className="font-display text-3xl font-bold tabular-nums">{num(daysByType[t])} j</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink/50">Jours ouvrés, du dimanche au jeudi.</p>
          </Section>
          {yearAbsences.length === 0 ? <EmptyState icon="calendar" title={`Aucune absence en ${year}`} /> : (
            <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-lift">
              <table className="tbl">
                <thead><tr><th>Motif</th><th>Période</th><th className="num">Jours</th><th>Note</th><th /></tr></thead>
                <tbody>
                  {yearAbsences.map((a) => (
                    <tr key={a.id}>
                      <td><span className="flex items-center gap-2 font-medium"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: absenceColors[a.type] }} />{absenceLabels[a.type]}</span></td>
                      <td className="whitespace-nowrap">{a.startDate === a.endDate ? dateFr(a.startDate) + (a.halfDay ? ' (½ journée)' : '') : `${dateFr(a.startDate)} → ${dateFr(a.endDate)}`}</td>
                      <td className="num">{num(a.days)}</td>
                      <td className="text-ink/70">{a.note}</td>
                      <td className="text-right"><IconButton icon="edit" label="Modifier l’absence" onClick={() => { setEditingAbs(a); setAbsOpen(true) }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'chantiers' && (
        projects.length === 0 ? <EmptyState icon="site" title="Affecté à aucun chantier" text="Ajoutez cette personne à l’équipe d’un chantier depuis la fiche du chantier." /> : (
          <ul className="grid gap-3 md:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link to={`/admin/chantiers/${p.id}`} className="block rounded-lg border border-line bg-white p-4 shadow-lift hover:border-ink/40">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{p.name}</p>
                    <Badge tone={p.status === 'DONE' ? 'green' : p.status === 'IN_PROGRESS' ? 'blue' : p.status === 'SUSPENDED' ? 'amber' : 'neutral'}>{projectStatusLabels[p.status]}</Badge>
                  </div>
                  {p.address && <p className="mt-0.5 flex items-center gap-1 text-sm text-ink/55"><Icon name="pin" size={14} />{p.address}</p>}
                  <div className="mt-3"><Progress value={p.progress} size="sm" /></div>
                </Link>
              </li>
            ))}
          </ul>
        )
      )}

      <EmployeeForm open={editOpen} user={user} onClose={() => setEditOpen(false)} onSaved={(u) => { setUser(u); setEditOpen(false); toast('Employé enregistré') }} />
      <PaymentForm open={payOpen} userId={user.id} userName={user.fullName} month={currentMonth()} onClose={() => setPayOpen(false)}
        suggested={user.monthlySalary != null ? Math.max(0, user.monthlySalary - (byMonth.get(currentMonth()) ?? 0)) : undefined}
        onSaved={() => { setPayOpen(false); toast('Paiement enregistré'); loadPayments() }} />
      <AbsenceForm open={absOpen} absence={editingAbs} users={[user]} defaultUserId={user.id} onClose={() => setAbsOpen(false)}
        onSaved={() => { setAbsOpen(false); toast('Absences mises à jour'); loadAbsences() }} />
      <PasswordModal open={pwdOpen} user={user} onClose={() => setPwdOpen(false)} onDone={() => { setPwdOpen(false); toast('Mot de passe modifié') }} />
    </div>
  )
}

export function YearPicker({ year, onChange }: { year: number; onChange: (y: number) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-line bg-white p-1">
      <IconButton icon="back" label="Année précédente" onClick={() => onChange(year - 1)} />
      <span className="w-14 text-center font-display text-lg font-bold tabular-nums">{year}</span>
      <IconButton icon="next" label="Année suivante" onClick={() => onChange(year + 1)} />
    </div>
  )
}

function PasswordModal({ open, user, onClose, onDone }: { open: boolean; user: UserAccount; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { if (open) { setPassword(''); setError('') } }, [open])
  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    try { await api(`/users/${user.id}/password`, { method: 'POST', json: { password } }); onDone() } catch (e) { setError((e as Error).message) }
  }
  return (
    <Modal open={open} onClose={onClose} title="Nouveau mot de passe"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button type="submit" form="pwd-form">Changer le mot de passe</Button></>}>
      <form id="pwd-form" onSubmit={onSubmit} className="space-y-4">
        <ErrorBanner message={error} />
        <Field label={`Mot de passe de ${user.fullName}`} htmlFor="pwd" hint="10 caractères minimum. Communiquez-le à la personne.">
          <input id="pwd" type="text" required minLength={10} maxLength={72} autoComplete="off" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      </form>
    </Modal>
  )
}
