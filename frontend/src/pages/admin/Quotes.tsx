import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DocumentForm, { type Preset } from '../../components/DocumentForm'
import { Badge, Button, EmptyState, ErrorBanner, FilterPills, Loading, PageHeader, SearchInput, Stat } from '../../components/ui'
import { dateFr, money, todayIso } from '../../lib/format'
import { api } from '../../lib/http'
import { quoteStatusLabels, type Client, type Project, type Quote, type QuoteStatus } from '../../lib/types'

type Filter = 'all' | QuoteStatus | 'expired'

export const isExpired = (q: Quote) => q.status === 'PENDING' && q.validUntil !== null && q.validUntil < todayIso()
export function QuoteBadge({ quote }: { quote: Quote }) {
  if (isExpired(quote)) return <Badge tone="red" dot>Expiré</Badge>
  const tone = quote.status === 'ACCEPTED' ? 'green' : quote.status === 'REFUSED' ? 'neutral' : quote.status === 'INVOICED' ? 'blue' : 'amber'
  return <Badge tone={tone} dot>{quoteStatusLabels[quote.status]}</Badge>
}

export default function Quotes() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [quotes, setQuotes] = useState<Quote[] | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [form, setForm] = useState<{ open: boolean; preset?: Preset }>({ open: false })
  const [error, setError] = useState('')

  const load = useCallback(() => { api<Quote[]>('/quotes').then(setQuotes).catch((e: Error) => setError(e.message)) }, [])
  useEffect(() => {
    load()
    api<Client[]>('/clients').then(setClients).catch((e: Error) => setError(e.message))
    api<Project[]>('/projects').then(setProjects).catch(() => undefined)
  }, [load])

  // Ouverture directe : /admin/devis?chantier=12 ou ?client=3
  useEffect(() => {
    const c = params.get('chantier'), cl = params.get('client')
    if (c || cl) {
      setForm({ open: true, preset: { projectId: c ? Number(c) : undefined, clientId: cl ? Number(cl) : undefined } })
      params.delete('chantier'); params.delete('client'); setParams(params, { replace: true })
    }
  }, [params, setParams])

  const list = quotes ?? []
  const clientName = (id: number) => clients.find((c) => c.id === id)?.name ?? ''
  const count = (s: QuoteStatus) => list.filter((x) => x.status === s).length
  const stats = useMemo(() => {
    const pending = list.filter((x) => x.status === 'PENDING' && !isExpired(x))
    const decided = list.filter((x) => x.status !== 'PENDING')
    const won = list.filter((x) => x.status === 'ACCEPTED' || x.status === 'INVOICED')
    return {
      pendingCount: pending.length, pendingTtc: pending.reduce((s, x) => s + x.totalTtc, 0),
      wonTtc: won.reduce((s, x) => s + x.totalTtc, 0),
      rate: decided.length ? Math.round((won.length / decided.length) * 100) : null,
    }
  }, [list])

  const shown = list
    .filter((x) => filter === 'all' || (filter === 'expired' ? isExpired(x) : filter === 'PENDING' ? x.status === 'PENDING' && !isExpired(x) : x.status === filter))
    .filter((x) => !q.trim() || `${x.number} ${clientName(x.clientId)} ${x.title ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div>
      <PageHeader title="Devis" subtitle="Chiffrez les travaux, imprimez le devis, puis transformez-le en facture en un clic une fois accepté."
        actions={<Button icon="plus" onClick={() => setForm({ open: true })}>Nouveau devis</Button>} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="En attente de réponse" value={stats.pendingCount} hint={`${money(stats.pendingTtc)} en jeu`} tone={stats.pendingCount > 0 ? 'amber' : undefined} />
        <Stat label="Montant des devis acceptés" value={money(stats.wonTtc)} tone="green" />
        <Stat label="Taux d’acceptation" value={stats.rate === null ? '—' : `${stats.rate} %`} hint="Sur les devis qui ont reçu une réponse" />
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterPills<Filter> value={filter} onChange={setFilter} options={[
          { id: 'all', label: 'Tous', count: list.length },
          { id: 'PENDING', label: 'En attente', count: list.filter((x) => x.status === 'PENDING' && !isExpired(x)).length },
          { id: 'expired', label: 'Expirés', count: list.filter(isExpired).length },
          { id: 'ACCEPTED', label: 'Acceptés', count: count('ACCEPTED') },
          { id: 'INVOICED', label: 'Facturés', count: count('INVOICED') },
          { id: 'REFUSED', label: 'Refusés', count: count('REFUSED') },
        ]} />
        <SearchInput value={q} onChange={setQ} placeholder="Numéro, client, objet" />
      </div>

      {quotes === null ? <Loading /> : shown.length === 0 ? (
        <EmptyState icon="invoice" title={list.length === 0 ? 'Aucun devis' : 'Aucun résultat'}
          text={list.length === 0 ? 'Un devis se saisit ligne par ligne, s’imprime pour le client et devient une facture quand il est accepté.' : undefined}
          action={list.length === 0 && <Button icon="plus" onClick={() => setForm({ open: true })}>Nouveau devis</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-lift">
          <table className="tbl">
            <thead><tr><th>Numéro</th><th>Client</th><th>Objet</th><th>Date</th><th>Valable jusqu’au</th><th>État</th><th className="num">Total</th></tr></thead>
            <tbody>
              {shown.map((x) => (
                <tr key={x.id} className="cursor-pointer" onClick={() => navigate(`/admin/devis/${x.id}`)}>
                  <td className="whitespace-nowrap font-semibold">{x.number}</td>
                  <td>{clientName(x.clientId)}</td>
                  <td className="text-ink/70">{x.title || <span className="text-ink/35">—</span>}</td>
                  <td className="whitespace-nowrap">{dateFr(x.issueDate)}</td>
                  <td className={`whitespace-nowrap ${isExpired(x) ? 'font-semibold text-wire-red' : ''}`}>{dateFr(x.validUntil) || <span className="text-ink/35">—</span>}</td>
                  <td><QuoteBadge quote={x} /></td>
                  <td className="num font-semibold">{money(x.totalTtc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DocumentForm kind="quote" open={form.open} doc={null} preset={form.preset} clients={clients} projects={projects}
        onClose={() => setForm({ open: false })} onSaved={(d) => { setForm({ open: false }); navigate(`/admin/devis/${d.id}`) }} />
    </div>
  )
}
