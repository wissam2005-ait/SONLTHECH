import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DocumentForm from '../../components/DocumentForm'
import PrintedDocument from '../../components/PrintedDocument'
import { Button, ErrorBanner, Loading, PageHeader, useToast } from '../../components/ui'
import { dateFr } from '../../lib/format'
import { api } from '../../lib/http'
import { downloadXlsx } from '../../lib/xlsx'
import { useCompany } from '../../lib/company'
import type { Client, Project, Quote, QuoteStatus } from '../../lib/types'
import { isExpired, QuoteBadge } from './Quotes'

export default function QuoteView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const company = useCompany()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => { api<Quote>(`/quotes/${id}`).then(setQuote).catch((e: Error) => setError(e.message)) }, [id])
  useEffect(() => {
    load()
    api<Client[]>('/clients').then(setClients).catch(() => undefined)
    api<Project[]>('/projects').then(setProjects).catch(() => undefined)
  }, [load])

  async function setStatus(status: QuoteStatus, message: string) {
    try { setQuote(await api<Quote>(`/quotes/${id}/status`, { method: 'PATCH', json: { status } })); toast(message) } catch (e) { setError((e as Error).message) }
  }

  async function toInvoice() {
    if (!window.confirm('Créer la facture à partir de ce devis ? Vous pourrez encore la modifier avant de l’émettre.')) return
    try {
      const q = await api<Quote>(`/quotes/${id}/invoice`, { method: 'POST', json: {} })
      toast('Facture créée à partir du devis')
      navigate(`/admin/factures/${q.invoiceId}`)
    } catch (e) { setError((e as Error).message) }
  }

  async function remove() {
    if (!window.confirm('Supprimer ce devis ?')) return
    try { await api(`/quotes/${id}`, { method: 'DELETE' }); toast('Devis supprimé'); navigate('/admin/devis') } catch (e) { setError((e as Error).message) }
  }

  function exportExcel() {
    if (!quote) return
    const client = clients.find((c) => c.id === quote.clientId)
    downloadXlsx({ kind: 'quote', fileName: `Devis_${quote.number}`, number: quote.number, issueDate: quote.issueDate, title: quote.title,
      subtitle: quote.subtitle, clientName: client?.name ?? '', companyName: company.name, vatRate: quote.vatRate, lines: quote.lines })
  }

  if (error && !quote) return <ErrorBanner message={error} />
  if (!quote) return <Loading />
  const invoiced = quote.status === 'INVOICED'

  return (
    <div>
      <div className="print:hidden">
        <PageHeader back={{ to: '/admin/devis', label: 'Devis' }} title={quote.number}
          subtitle={<span className="flex flex-wrap items-center gap-2">
            <QuoteBadge quote={quote} />
            {quote.title && <span>{quote.title}</span>}
            {isExpired(quote) && <span className="text-wire-red">validité dépassée depuis le {dateFr(quote.validUntil)}</span>}
            {invoiced && quote.invoiceId && <Link to={`/admin/factures/${quote.invoiceId}`} className="underline">voir la facture</Link>}
          </span>}
          actions={<>
            {!invoiced && <Button variant="danger" icon="trash" onClick={remove}>Supprimer</Button>}
            {!invoiced && <Button variant="secondary" icon="edit" onClick={() => setEditOpen(true)}>Modifier</Button>}
            {quote.status === 'PENDING' && <Button variant="secondary" icon="x" onClick={() => setStatus('REFUSED', 'Devis marqué refusé')}>Refusé</Button>}
            {quote.status === 'PENDING' && <Button variant="secondary" icon="check" onClick={() => setStatus('ACCEPTED', 'Devis accepté')}>Accepté</Button>}
            {quote.status === 'REFUSED' && <Button variant="secondary" onClick={() => setStatus('PENDING', 'Devis remis en attente')}>Remettre en attente</Button>}
            {(quote.status === 'PENDING' || quote.status === 'ACCEPTED') && <Button variant="volt" icon="invoice" onClick={toInvoice}>Transformer en facture</Button>}
            <Button variant="secondary" icon="sheet" onClick={exportExcel}>Export Excel</Button>
            <Button variant="secondary" icon="print" onClick={() => window.print()}>Imprimer / PDF</Button>
          </>} />
        <ErrorBanner message={error} onClose={() => setError('')} />
      </div>

      <PrintedDocument kind="quote" number={quote.number} issueDate={quote.issueDate} secondDate={quote.validUntil} title={quote.title} subtitle={quote.subtitle}
        client={clients.find((c) => c.id === quote.clientId) ?? null} project={projects.find((p) => p.id === quote.projectId) ?? null}
        lines={quote.lines} vatRate={quote.vatRate} totalHt={quote.totalHt} totalVat={quote.totalVat} totalTtc={quote.totalTtc} notes={quote.notes} />

      <DocumentForm kind="quote" open={editOpen} doc={quote} clients={clients} projects={projects} onClose={() => setEditOpen(false)}
        onSaved={(d) => { setQuote(d as Quote); setEditOpen(false); toast('Devis enregistré') }} />
    </div>
  )
}
