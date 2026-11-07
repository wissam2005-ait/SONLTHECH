import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../../components/icons'
import { Badge, Button, EmptyState, ErrorBanner, FilterPills, Loading, PageHeader, useToast } from '../../components/ui'
import { dateTimeFr } from '../../lib/format'
import { api } from '../../lib/http'
import { requestStatusLabels, type ContactRequest, type RequestStatus } from '../../lib/types'

type Filter = '' | RequestStatus
const tone: Record<RequestStatus, 'volt' | 'blue' | 'amber' | 'green' | 'neutral'> = { NEW: 'volt', IN_PROGRESS: 'blue', QUOTE_SENT: 'amber', ACCEPTED: 'green', REFUSED: 'neutral' }

export default function Requests() {
  const toast = useToast()
  const [all, setAll] = useState<ContactRequest[] | null>(null)
  const [filter, setFilter] = useState<Filter>('')
  const [error, setError] = useState('')

  const load = useCallback(() => { api<ContactRequest[]>('/contact-requests').then(setAll).catch((e: Error) => setError(e.message)) }, [])
  useEffect(load, [load])

  async function changeStatus(id: number, status: RequestStatus) {
    try { await api(`/contact-requests/${id}/status`, { method: 'PATCH', json: { status } }); load() } catch (e) { setError((e as Error).message) }
  }
  async function createClient(id: number) {
    try { await api(`/contact-requests/${id}/client`, { method: 'POST' }); toast('Fiche client créée'); load() } catch (e) { setError((e as Error).message) }
  }

  const list = all ?? []
  const shown = list.filter((r) => !filter || r.status === filter)
  const count = (s: RequestStatus) => list.filter((r) => r.status === s).length

  return (
    <div>
      <PageHeader title="Demandes" subtitle="Les demandes de devis et messages reçus depuis le site." />
      <ErrorBanner message={error} onClose={() => setError('')} />
      <div className="mb-5">
        <FilterPills<Filter> value={filter} onChange={setFilter} options={[
          { id: '', label: 'Toutes', count: list.length },
          ...(Object.keys(requestStatusLabels) as RequestStatus[]).map((s) => ({ id: s as Filter, label: requestStatusLabels[s], count: count(s) })),
        ]} />
      </div>

      {all === null ? <Loading /> : shown.length === 0 ? (
        <EmptyState icon="inbox" title="Aucune demande" text="Les formulaires « Devis » et « Contact » du site arrivent ici." />
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id} className={`rounded-lg border bg-white p-5 shadow-lift ${r.status === 'NEW' ? 'border-l-4 border-line border-l-volt' : 'border-line'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-display text-xl font-bold">
                    {r.fullName}
                    <Badge tone={r.kind === 'QUOTE' ? 'blue' : 'neutral'}>{r.kind === 'QUOTE' ? 'Demande de devis' : 'Message'}</Badge>
                    {r.workType && <Badge>{r.workType}</Badge>}
                  </p>
                  <p className="mt-1 text-sm text-ink/50">Reçue le {dateTimeFr(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={tone[r.status]}>{requestStatusLabels[r.status]}</Badge>
                  <select aria-label={`Statut de la demande de ${r.fullName}`} className="h-9 rounded-md border border-line bg-white px-2 text-sm font-semibold" value={r.status} onChange={(e) => changeStatus(r.id, e.target.value as RequestStatus)}>
                    {(Object.keys(requestStatusLabels) as RequestStatus[]).map((s) => <option key={s} value={s}>{requestStatusLabels[s]}</option>)}
                  </select>
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {r.phone && <li className="flex items-center gap-1.5"><Icon name="phone" size={15} className="text-ink/40" /><a href={`tel:${r.phone}`} className="font-semibold hover:underline">{r.phone}</a></li>}
                {r.email && <li className="flex items-center gap-1.5"><Icon name="mail" size={15} className="text-ink/40" /><a href={`mailto:${r.email}`} className="font-semibold hover:underline">{r.email}</a></li>}
                {r.siteAddress && <li className="flex items-center gap-1.5"><Icon name="pin" size={15} className="text-ink/40" />{r.siteAddress}</li>}
              </ul>
              <p className="mt-3 whitespace-pre-line rounded-md bg-panel/70 p-3 text-ink/85">{r.message}</p>
              <div className="mt-3 flex justify-end">
                {r.clientId ? <Badge tone="green" dot>Fiche client créée</Badge> : <Button size="sm" variant="secondary" icon="clients" onClick={() => createClient(r.id)}>Créer la fiche client</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
