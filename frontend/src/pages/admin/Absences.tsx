import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AbsenceForm from '../../components/AbsenceForm'
import { Button, ErrorBanner, IconButton, Loading, PageHeader, Section, Tabs, useToast } from '../../components/ui'
import { currentMonth, dateFr, isWeekend, isoDay, monthLabel, num, shiftMonth, todayIso } from '../../lib/format'
import { api } from '../../lib/http'
import { absenceColors, absenceLabels, type Absence, type AbsenceSummaryRow, type AbsenceType, type UserAccount } from '../../lib/types'
import { YearPicker } from './EmployeeDetail'

type View = 'planning' | 'bilan'
const dayLetters = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

export default function Absences() {
  const toast = useToast()
  const [view, setView] = useState<View>('planning')
  const [month, setMonth] = useState(currentMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [users, setUsers] = useState<UserAccount[]>([])
  const [items, setItems] = useState<Absence[] | null>(null)
  const [summary, setSummary] = useState<AbsenceSummaryRow[]>([])
  const [form, setForm] = useState<{ open: boolean; absence: Absence | null; userId?: number; date?: string }>({ open: false, absence: null })
  const [error, setError] = useState('')

  const [y, m] = month.split('-').map(Number)
  const days = useMemo(() => {
    const n = new Date(y, m, 0).getDate()
    return Array.from({ length: n }, (_, i) => new Date(y, m - 1, i + 1))
  }, [y, m])
  const from = isoDay(days[0])
  const to = isoDay(days[days.length - 1])

  const load = useCallback(() => {
    api<Absence[]>(`/absences?from=${from}&to=${to}`).then(setItems).catch((e: Error) => setError(e.message))
  }, [from, to])
  useEffect(load, [load])
  useEffect(() => { api<UserAccount[]>('/users').then(setUsers).catch((e: Error) => setError(e.message)) }, [])
  useEffect(() => {
    if (view === 'bilan') api<AbsenceSummaryRow[]>(`/absences/summary?year=${year}`).then(setSummary).catch((e: Error) => setError(e.message))
  }, [view, year, items])

  // Le planning montre les personnes actives, plus celles qui ont une absence ce mois-ci
  const rows = users.filter((u) => (u.active && u.role !== 'ADMIN') || items?.some((a) => a.userId === u.id))
  const today = todayIso()

  function cellAbsence(userId: number, day: string) {
    return items?.find((a) => a.userId === userId && a.startDate <= day && a.endDate >= day)
  }

  const monthDays = (items ?? []).reduce((acc, a) => {
    const t = a.type
    let d = 0
    for (const day of days) {
      const iso = isoDay(day)
      if (iso >= a.startDate && iso <= a.endDate && !isWeekend(day)) d += a.halfDay ? 0.5 : 1
    }
    acc[t] = (acc[t] ?? 0) + d
    return acc
  }, {} as Partial<Record<AbsenceType, number>>)

  return (
    <div>
      <PageHeader title="Absences" subtitle="Congés, arrêts maladie, absences injustifiées : tout le monde sur une seule grille."
        actions={<Button icon="plus" onClick={() => setForm({ open: true, absence: null })}>Déclarer une absence</Button>} />
      <ErrorBanner message={error} onClose={() => setError('')} />

      <Tabs<View> value={view} onChange={setView} tabs={[{ id: 'planning', label: 'Planning du mois' }, { id: 'bilan', label: 'Bilan annuel' }]} />

      {view === 'planning' && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-md border border-line bg-white p-1">
              <IconButton icon="back" label="Mois précédent" onClick={() => setMonth(shiftMonth(month, -1))} />
              <span className="min-w-[10rem] text-center font-display text-lg font-bold">{monthLabel(month)}</span>
              <IconButton icon="next" label="Mois suivant" onClick={() => setMonth(shiftMonth(month, 1))} />
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Légende">
              {(Object.keys(absenceLabels) as AbsenceType[]).map((t) => (
                <li key={t} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: absenceColors[t] }} />{absenceLabels[t]}{monthDays[t] ? <span className="tabular-nums text-ink/45">({num(monthDays[t])} j)</span> : null}</li>
              ))}
            </ul>
          </div>

          {items === null ? <Loading /> : rows.length === 0 ? (
            <p className="rounded-lg border border-line bg-white p-6 text-ink/60">Aucun employé actif. <Link to="/admin/employes" className="font-semibold underline">Ajoutez votre équipe</Link>.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-lift">
              <table className="w-full border-collapse text-sm" style={{ minWidth: 220 + days.length * 30 }}>
                <thead>
                  <tr>
                    <th className="sticky left-0 z-[2] w-52 border-b border-r border-line bg-[#f6f8fa] px-3 py-2 text-left text-xs font-semibold text-ink/60">Employé</th>
                    {days.map((d) => {
                      const we = isWeekend(d)
                      const isToday = isoDay(d) === today
                      return (
                        <th key={d.getDate()} className={`border-b border-line px-0 py-1.5 text-center text-[11px] font-semibold ${we ? 'bg-ink/[.06] text-ink/40' : 'bg-[#f6f8fa] text-ink/60'}`}>
                          <span className="block">{dayLetters[d.getDay()]}</span>
                          <span className={`mx-auto mt-0.5 flex h-5 w-5 items-center justify-center rounded-full tabular-nums ${isToday ? 'bg-volt text-ink' : ''}`}>{d.getDate()}</span>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id}>
                      <th scope="row" className="sticky left-0 z-[1] border-b border-r border-line bg-white px-3 py-2 text-left font-semibold">
                        <Link to={`/admin/employes/${u.id}`} className="hover:underline">{u.fullName}</Link>
                      </th>
                      {days.map((d) => {
                        const iso = isoDay(d)
                        const we = isWeekend(d)
                        const a = cellAbsence(u.id, iso)
                        const label = a ? `${u.fullName}, ${dateFr(iso)} : ${absenceLabels[a.type]}${a.halfDay ? ' (demi-journée)' : ''}` : `Déclarer une absence pour ${u.fullName} le ${dateFr(iso)}`
                        return (
                          <td key={iso} className={`h-10 border-b border-line/70 p-[3px] ${we ? 'bg-ink/[.04]' : ''}`}>
                            <button type="button" aria-label={label} title={label}
                              onClick={() => setForm(a ? { open: true, absence: a } : { open: true, absence: null, userId: u.id, date: iso })}
                              className={`block h-full w-full rounded-[3px] transition-colors ${a ? '' : 'hover:bg-volt/40'}`}
                              style={a ? { background: absenceColors[a.type], opacity: we ? 0.45 : 1, ...(a.halfDay ? { backgroundImage: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,.75) 50%)' } : {}) } : undefined} />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-ink/50">Cliquez sur une case vide pour déclarer une absence, sur une case colorée pour la modifier. Demi-journée : case à moitié remplie.</p>

          {items && items.length > 0 && (
            <Section title={`Détail — ${monthLabel(month)}`} className="mt-6">
              <ul className="divide-y divide-line">
                {items.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: absenceColors[a.type] }} />
                      <div>
                        <p className="font-semibold">{a.userName} <span className="font-normal text-ink/60">— {absenceLabels[a.type]}</span></p>
                        <p className="text-sm text-ink/55">
                          {a.startDate === a.endDate ? dateFr(a.startDate) : `du ${dateFr(a.startDate)} au ${dateFr(a.endDate)}`}
                          {a.halfDay && ', demi-journée'} ({num(a.days)} j ouvré{a.days > 1 ? 's' : ''}){a.note && `. ${a.note}`}
                        </p>
                      </div>
                    </div>
                    <IconButton icon="edit" label="Modifier" onClick={() => setForm({ open: true, absence: a })} />
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}

      {view === 'bilan' && (
        <>
          <div className="mb-4"><YearPicker year={year} onChange={setYear} /></div>
          <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-lift">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Employé</th>
                  {(Object.keys(absenceLabels) as AbsenceType[]).map((t) => <th key={t} className="num"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: absenceColors[t] }} />{absenceLabels[t]}</span></th>)}
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((r) => (
                  <tr key={r.userId}>
                    <td className="font-semibold"><Link to={`/admin/employes/${r.userId}`} className="hover:underline">{r.fullName}</Link>{!r.active && <span className="ml-2 text-xs font-normal text-ink/45">(désactivé)</span>}</td>
                    {(Object.keys(absenceLabels) as AbsenceType[]).map((t) => <td key={t} className="num">{r.days[t] ? num(r.days[t]) : <span className="text-ink/25">0</span>}</td>)}
                    <td className="num font-bold">{num(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink/50">En jours ouvrés (du dimanche au jeudi), sur l’année {year}.</p>
        </>
      )}

      <AbsenceForm open={form.open} absence={form.absence} users={users} defaultUserId={form.userId} defaultDate={form.date}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
        onSaved={() => { setForm((f) => ({ ...f, open: false })); toast('Absences mises à jour'); load() }} />
    </div>
  )
}
