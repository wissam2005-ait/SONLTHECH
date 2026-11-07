import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/icons'
import { Badge, ErrorBanner, Loading, PageHeader, Progress, Section, Stat } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { dateFr, dateLong, money, todayIso } from '../../lib/format'
import { api } from '../../lib/http'
import { absenceColors, absenceLabels, type AbsenceType } from '../../lib/types'

interface Summary {
  newRequests: number; activeProjects: number; clients: number; activeAccounts: number; openTasks: number
  revenueMonthHt: number; revenueYearHt: number; unpaidTtc: number; overdueCount: number
  salariesRemaining: number; materialsToBuy: number
  projects: { id: number; name: string; progress: number; endDate: string | null; late: boolean }[]
  overdueInvoices: { id: number; number: string; clientName: string; totalTtc: number; dueDate: string }[]
  absentToday: { userId: number; fullName: string; type: AbsenceType; endDate: string; halfDay: boolean }[]
}

export default function Dashboard() {
  const { session } = useAuth()
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { api<Summary>('/dashboard').then(setData).catch((e: Error) => setError(e.message)) }, [])

  const hour = new Date().getHours()
  const hello = hour < 18 ? 'Bonjour' : 'Bonsoir'
  const firstName = session?.fullName.split(' ')[0] ?? ''
  const month = new Date().toLocaleDateString('fr-FR', { month: 'long' })

  return (
    <div>
      <PageHeader title={`${hello} ${firstName}`} subtitle={dateLong(todayIso()).replace(/^./, (c) => c.toUpperCase())} />
      <ErrorBanner message={error} />
      {!data ? (!error && <Loading />) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={`Facturé en ${month}`} value={money(data.revenueMonthHt)} hint={`${money(data.revenueYearHt)} depuis janvier`} to="/admin/factures" />
            <Stat label="À encaisser" value={money(data.unpaidTtc)} tone={data.unpaidTtc > 0 ? 'amber' : undefined}
              hint={data.overdueCount > 0 ? `${data.overdueCount} facture${data.overdueCount > 1 ? 's' : ''} en retard` : 'Aucun retard de paiement'} to="/admin/factures" />
            <Stat label="Salaires restant à verser" value={money(data.salariesRemaining)} tone={data.salariesRemaining > 0 ? 'amber' : 'green'} hint={`Mois de ${month}`} to="/admin/salaires" />
            <Stat label="Chantiers en cours" value={data.activeProjects} hint={`${data.openTasks} tâche${data.openTasks > 1 ? 's' : ''} ouverte${data.openTasks > 1 ? 's' : ''}`} to="/admin/chantiers" />
          </div>

          {(data.newRequests > 0 || data.materialsToBuy > 0) && (
            <div className="mt-3 flex flex-wrap gap-3">
              {data.newRequests > 0 && (
                <Link to="/admin/demandes" className="flex items-center gap-2 rounded-md bg-volt px-4 py-2.5 text-sm font-semibold text-ink hover:brightness-95">
                  <Icon name="inbox" size={17} />{data.newRequests} nouvelle{data.newRequests > 1 ? 's' : ''} demande{data.newRequests > 1 ? 's' : ''} de devis ou de contact
                </Link>
              )}
              {data.materialsToBuy > 0 && (
                <Link to="/admin/materiel" className="flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:border-ink/40">
                  <Icon name="box" size={17} />{data.materialsToBuy} ligne{data.materialsToBuy > 1 ? 's' : ''} de matériel à acheter
                </Link>
              )}
            </div>
          )}

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <Section title="Chantiers en cours" className="lg:col-span-2" actions={<Link to="/admin/chantiers" className="text-sm font-semibold text-ink/60 hover:text-ink">Tous les chantiers</Link>}>
              {data.projects.length === 0 ? <p className="text-ink/55">Aucun chantier en cours.</p> : (
                <ul className="divide-y divide-line">
                  {data.projects.map((p) => (
                    <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                      <Link to={`/admin/chantiers/${p.id}`} className="group block">
                        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-semibold group-hover:underline">{p.name}</p>
                          <p className={`text-sm ${p.late ? 'font-semibold text-wire-red' : 'text-ink/55'}`}>
                            {p.endDate ? (p.late ? `En retard, prévu le ${dateFr(p.endDate)}` : `Fin prévue le ${dateFr(p.endDate)}`) : 'Sans date de fin'}
                          </p>
                        </div>
                        <Progress value={p.progress} size="sm" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <div className="space-y-5">
              <Section title="Absents aujourd’hui" actions={<Link to="/admin/absences" className="text-sm font-semibold text-ink/60 hover:text-ink">Planning</Link>}>
                {data.absentToday.length === 0 ? <p className="text-ink/55">Toute l’équipe est présente.</p> : (
                  <ul className="space-y-2.5">
                    {data.absentToday.map((a) => (
                      <li key={a.userId} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: absenceColors[a.type] }} />
                        <div>
                          <Link to={`/admin/employes/${a.userId}`} className="font-semibold hover:underline">{a.fullName}</Link>
                          <p className="text-sm text-ink/55">{absenceLabels[a.type]}{a.halfDay ? ', demi-journée' : a.endDate !== todayIso() ? `, jusqu’au ${dateFr(a.endDate)}` : ''}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Factures à relancer">
                {data.overdueInvoices.length === 0 ? <p className="text-ink/55">Aucune facture en retard.</p> : (
                  <ul className="space-y-2">
                    {data.overdueInvoices.map((i) => (
                      <li key={i.id}>
                        <Link to={`/admin/factures/${i.id}`} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-panel">
                          <span className="min-w-0"><span className="block truncate font-semibold">{i.clientName}</span><span className="text-xs text-ink/55">{i.number}, échue le {dateFr(i.dueDate)}</span></span>
                          <Badge tone="red">{money(i.totalTtc)}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
