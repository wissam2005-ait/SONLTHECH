import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PaymentForm from '../../components/PaymentForm'
import { Badge, Button, EmptyState, ErrorBanner, IconButton, Loading, PageHeader, Stat, useToast } from '../../components/ui'
import { currentMonth, money, monthLabel, num, shiftMonth } from '../../lib/format'
import { api } from '../../lib/http'
import type { SalaryRow } from '../../lib/types'

export default function Salaries() {
  const toast = useToast()
  const [month, setMonth] = useState(currentMonth())
  const [rows, setRows] = useState<SalaryRow[] | null>(null)
  const [paying, setPaying] = useState<SalaryRow | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api<SalaryRow[]>(`/salaries?month=${month}`).then(setRows).catch((e: Error) => setError(e.message))
  }, [month])
  useEffect(load, [load])

  const list = rows ?? []
  const totalDue = list.reduce((s, r) => s + r.monthlyAmount, 0)
  const totalPaid = list.reduce((s, r) => s + r.paid, 0)
  const remaining = list.reduce((s, r) => s + Math.max(0, r.remaining), 0)
  const missing = list.filter((r) => r.monthlyAmount === 0).length

  return (
    <div>
      <PageHeader title="Salaires" subtitle="Ce qui est dû, ce qui est versé, ce qu’il reste à payer."
        actions={
          <div className="flex items-center gap-1 rounded-md border border-line bg-white p-1">
            <IconButton icon="back" label="Mois précédent" onClick={() => setMonth(shiftMonth(month, -1))} />
            <span className="min-w-[10rem] text-center font-display text-lg font-bold">{monthLabel(month)}</span>
            <IconButton icon="next" label="Mois suivant" onClick={() => setMonth(shiftMonth(month, 1))} />
          </div>
        } />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="À verser ce mois" value={money(totalDue)} />
        <Stat label="Déjà versé" value={money(totalPaid)} tone={totalPaid > 0 ? 'green' : undefined} />
        <Stat label="Reste à verser" value={money(remaining)} tone={remaining > 0 ? 'amber' : 'green'} />
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      {missing > 0 && (
        <p className="mb-4 rounded-md border border-wire-amber/30 bg-wire-amber/5 px-4 py-3 text-sm text-wire-amber">
          {missing} personne{missing > 1 ? 's n’ont' : ' n’a'} pas de salaire mensuel renseigné. Renseignez-le depuis la fiche de l’employé.
        </p>
      )}

      {rows === null ? <Loading /> : list.length === 0 ? (
        <EmptyState icon="wallet" title="Aucun employé actif" text="Les employés et stagiaires actifs apparaissent ici." action={<Link to="/admin/employes"><Button icon="users">Voir les employés</Button></Link>} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-lift">
          <table className="tbl">
            <thead><tr><th>Employé</th><th className="num">Salaire</th><th className="num">Versé</th><th className="num">Reste</th><th>Absences du mois</th><th>État</th><th /></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.userId}>
                  <td>
                    <Link to={`/admin/employes/${r.userId}`} className="font-semibold hover:underline">{r.fullName}</Link>
                    {r.jobTitle && <p className="text-xs text-ink/55">{r.jobTitle}</p>}
                  </td>
                  <td className="num">{r.monthlyAmount > 0 ? money(r.monthlyAmount) : <span className="text-ink/35">—</span>}</td>
                  <td className="num">{money(r.paid)}</td>
                  <td className="num font-semibold">{r.remaining > 0 ? money(r.remaining) : '—'}</td>
                  <td>
                    {r.absenceDays > 0 ? (
                      <span className="text-sm">
                        {num(r.absenceDays)} j
                        {r.unpaidAbsenceDays > 0 && <span className="ml-1.5"><Badge tone="red">dont {num(r.unpaidAbsenceDays)} j non payés</Badge></span>}
                      </span>
                    ) : <span className="text-ink/35">—</span>}
                  </td>
                  <td>
                    {r.monthlyAmount === 0 ? <Badge>Non renseigné</Badge>
                      : r.remaining <= 0 ? <Badge tone="green" dot>{r.remaining < 0 ? `Payé (+${money(-r.remaining)})` : 'Payé'}</Badge>
                      : r.paid > 0 ? <Badge tone="amber" dot>Partiel</Badge>
                      : <Badge tone="red" dot>À payer</Badge>}
                  </td>
                  <td className="text-right">
                    <Button size="sm" variant={r.remaining > 0 ? 'primary' : 'secondary'} icon="plus" onClick={() => setPaying(r)}>Paiement</Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>Total</td><td className="num">{money(totalDue)}</td><td className="num">{money(totalPaid)}</td><td className="num">{money(remaining)}</td><td colSpan={3} /></tr></tfoot>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-ink/50">Les jours d’absence sans solde ou injustifiée sont signalés pour information : ajustez le montant versé si besoin. L’historique complet est dans la fiche de chaque employé.</p>

      <PaymentForm open={paying !== null} userId={paying?.userId ?? null} userName={paying?.fullName ?? ''} month={month}
        suggested={paying ? Math.max(0, paying.remaining) : undefined}
        onClose={() => setPaying(null)} onSaved={() => { setPaying(null); toast('Paiement enregistré'); load() }} />
    </div>
  )
}
