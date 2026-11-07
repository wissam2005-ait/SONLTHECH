import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DocumentForm from '../../components/DocumentForm'
import { Field, inputClass } from '../../components/Field'
import { Badge, Button, EmptyState, ErrorBanner, FilterPills, IconButton, Loading, Modal, PageHeader, SearchInput, Stat, useToast } from '../../components/ui'
import { dateFr, money, isoDay, num, parseNum, round2, todayIso } from '../../lib/format'
import { api } from '../../lib/http'
import { invoiceStatusLabels, type Client, type Invoice, type Material, type Project } from '../../lib/types'

type Filter = 'all' | 'DRAFT' | 'SENT' | 'late' | 'PAID'

export const isLate = (i: Invoice) => i.status === 'SENT' && i.dueDate !== null && i.dueDate < todayIso()
export function InvoiceBadge({ invoice }: { invoice: Invoice }) {
  if (isLate(invoice)) return <Badge tone="red" dot>{invoice.paidAmount > 0 ? 'En retard, partielle' : 'En retard'}</Badge>
  if (invoice.status === 'SENT' && invoice.paidAmount > 0) return <Badge tone="amber" dot>Partiellement payée</Badge>
  return <Badge tone={invoice.status === 'PAID' ? 'green' : invoice.status === 'SENT' ? 'blue' : 'neutral'} dot>{invoiceStatusLabels[invoice.status]}</Badge>
}

export default function Invoices() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [genFor, setGenFor] = useState<string | null>(null)
  const [freeOpen, setFreeOpen] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => { api<Invoice[]>('/invoices').then(setInvoices).catch((e: Error) => setError(e.message)) }, [])
  useEffect(() => {
    load()
    api<Project[]>('/projects').then(setProjects).catch((e: Error) => setError(e.message))
    api<Client[]>('/clients').then(setClients).catch((e: Error) => setError(e.message))
  }, [load])

  // Ouverture directe depuis la fiche d'un chantier : /admin/factures?chantier=12
  useEffect(() => {
    const c = params.get('chantier')
    if (c) { setGenFor(c); params.delete('chantier'); setParams(params, { replace: true }) }
  }, [params, setParams])

  const list = invoices ?? []
  const projectName = (id: number | null) => (id === null ? '' : projects.find((p) => p.id === id)?.name ?? `Chantier n°${id}`)
  const clientName = (id: number) => clients.find((c) => c.id === id)?.name ?? ''
  const year = new Date().getFullYear()

  const stats = useMemo(() => ({
    toCollect: list.filter((i) => i.status === 'SENT').reduce((s, i) => s + i.remaining, 0),
    late: list.filter(isLate),
    paidYear: list.filter((i) => (i.issueDate ?? '').startsWith(String(year))).reduce((s, i) => s + i.paidAmount, 0),
    revenueYear: list.filter((i) => i.status !== 'DRAFT' && (i.issueDate ?? '').startsWith(String(year))).reduce((s, i) => s + i.totalHt, 0),
  }), [list, year])

  const shown = list
    .filter((i) => filter === 'all' || (filter === 'late' ? isLate(i) : i.status === filter))
    .filter((i) => !q.trim() || `${i.number ?? ''} ${clientName(i.clientId)} ${projectName(i.projectId)} ${i.title ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div>
      <PageHeader title="Factures" subtitle="Factures libres, depuis un chantier ou depuis un devis. Acomptes et reste à payer suivis automatiquement."
        actions={<>
          <Button variant="secondary" icon="site" onClick={() => setGenFor('')}>Depuis un chantier</Button>
          <Button icon="plus" onClick={() => setFreeOpen(true)}>Nouvelle facture</Button>
        </>} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Chiffre d’affaires ${year}`} value={money(stats.revenueYear)} />
        <Stat label={`Encaissé en ${year}`} value={money(stats.paidYear)} tone="green" />
        <Stat label="À encaisser" value={money(stats.toCollect)} tone={stats.toCollect > 0 ? 'amber' : undefined} />
        <Stat label="Factures en retard" value={stats.late.length} tone={stats.late.length > 0 ? 'red' : undefined}
          hint={stats.late.length > 0 ? `${money(stats.late.reduce((s, i) => s + i.remaining, 0))} à relancer` : 'Aucune relance à faire'} />
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterPills<Filter> value={filter} onChange={setFilter} options={[
          { id: 'all', label: 'Toutes', count: list.length },
          { id: 'DRAFT', label: 'Brouillons', count: list.filter((i) => i.status === 'DRAFT').length },
          { id: 'SENT', label: 'Émises', count: list.filter((i) => i.status === 'SENT').length },
          { id: 'late', label: 'En retard', count: stats.late.length },
          { id: 'PAID', label: 'Payées', count: list.filter((i) => i.status === 'PAID').length },
        ]} />
        <SearchInput value={q} onChange={setQ} placeholder="Numéro, client, objet" />
      </div>

      {invoices === null ? <Loading /> : shown.length === 0 ? (
        <EmptyState icon="invoice" title={list.length === 0 ? 'Aucune facture' : 'Aucun résultat'}
          text={list.length === 0 ? 'Créez une facture ligne par ligne, ou générez-la à partir du matériel d’un chantier.' : undefined}
          action={list.length === 0 && <Button icon="plus" onClick={() => setFreeOpen(true)}>Nouvelle facture</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-lift">
          <table className="tbl">
            <thead><tr><th>Numéro</th><th>Client</th><th>Objet</th><th>Émise le</th><th>Échéance</th><th>État</th><th className="num">Total</th><th className="num">Reste à payer</th></tr></thead>
            <tbody>
              {shown.map((i) => (
                <tr key={i.id} className="cursor-pointer" onClick={() => navigate(`/admin/factures/${i.id}`)}>
                  <td className="whitespace-nowrap font-semibold">{i.number ?? <span className="text-ink/55">Brouillon n°{i.id}</span>}</td>
                  <td>{clientName(i.clientId)}</td>
                  <td className="text-ink/70">{i.title || projectName(i.projectId) || <span className="text-ink/35">—</span>}</td>
                  <td className="whitespace-nowrap">{dateFr(i.issueDate) || <span className="text-ink/35">—</span>}</td>
                  <td className={`whitespace-nowrap ${isLate(i) ? 'font-semibold text-wire-red' : ''}`}>{dateFr(i.dueDate) || <span className="text-ink/35">—</span>}</td>
                  <td><InvoiceBadge invoice={i} /></td>
                  <td className="num font-semibold">{money(i.totalTtc)}</td>
                  <td className="num">{i.status === 'PAID' ? <span className="text-wire-green">Soldée</span> : i.status === 'DRAFT' ? <span className="text-ink/35">—</span> : <strong>{money(i.remaining)}</strong>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DocumentForm kind="invoice" open={freeOpen} doc={null} clients={clients} projects={projects} onClose={() => setFreeOpen(false)}
        onSaved={(inv) => { setFreeOpen(false); navigate(`/admin/factures/${inv.id}`) }} />
      <GenerateModal open={genFor !== null} initialProjectId={genFor ?? ''} projects={projects} onClose={() => setGenFor(null)}
        onCreated={(inv) => { setGenFor(null); load(); navigate(`/admin/factures/${inv.id}`) }} />
    </div>
  )
}

interface Extra { description: string; unit: string; quantity: string; unitPrice: string }
const emptyExtra: Extra = { description: 'Main-d’œuvre', unit: 'h', quantity: '1', unitPrice: '' }

function GenerateModal({ open, initialProjectId, projects, onClose, onCreated }:
  { open: boolean; initialProjectId: string; projects: Project[]; onClose: () => void; onCreated: (i: Invoice) => void }) {
  const toast = useToast()
  const [projectId, setProjectId] = useState('')
  const [billable, setBillable] = useState<Material[]>([])
  const [markup, setMarkup] = useState('20')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [extras, setExtras] = useState<Extra[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setProjectId(initialProjectId); setExtras([]); setNotes(''); setError('')
    const d = new Date(); d.setDate(d.getDate() + 30)
    setDueDate(isoDay(d))
  }, [open, initialProjectId])

  useEffect(() => {
    if (!projectId) { setBillable([]); return }
    api<Material[]>(`/materials?projectId=${projectId}`).then((all) => setBillable(all.filter((m) => m.purchasedOn && !m.invoiceId))).catch((e: Error) => setError(e.message))
  }, [projectId])

  const preview = useMemo(() => {
    const k = 1 + (parseNum(markup) || 0) / 100
    const mat = billable.reduce((s, m) => s + round2(m.quantity * round2((m.unitCost ?? 0) * k)), 0)
    const ext = extras.reduce((s, e) => s + round2((parseNum(e.quantity) || 0) * (parseNum(e.unitPrice) || 0)), 0)
    const ht = round2(mat + ext)
    return { mat, ht }
  }, [billable, extras, markup])

  const setExtra = (i: number, k: keyof Extra, v: string) => setExtras((l) => l.map((e, j) => (j === i ? { ...e, [k]: v } : e)))

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError('')
    setBusy(true)
    try {
      const created = await api<Invoice>('/invoices/generate', {
        method: 'POST',
        json: {
          projectId: Number(projectId), markupPercent: parseNum(markup), vatRate: 0, dueDate: dueDate || null, notes,
          extraLines: extras.filter((e) => e.description.trim()).map((e) => ({ description: e.description, unit: e.unit, quantity: parseNum(e.quantity), unitPrice: parseNum(e.unitPrice) })),
        },
      })
      toast('Brouillon de facture créé')
      onCreated(created)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} wide title="Générer une facture"
      footer={<>
        <p className="mr-auto self-center text-sm">Total : <strong className="font-display text-xl">{money(preview.ht)}</strong></p>
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button type="submit" form="gen-form" disabled={busy || !projectId}>Créer le brouillon</Button>
      </>}>
      <form id="gen-form" onSubmit={onSubmit} className="space-y-5">
        <ErrorBanner message={error} />
        <Field label="Chantier" htmlFor="g-project" hint="La facture reprend le matériel acheté et pas encore facturé de ce chantier.">
          <select id="g-project" required className={inputClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Choisir…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        {projectId && (
          <>
            {billable.length === 0 ? (
              <p className="rounded-md bg-wire-amber/5 px-3 py-2 text-sm text-wire-amber">Aucun matériel acheté et non facturé sur ce chantier. Renseignez les prix dans l’onglet Matériel du chantier, ou ajoutez des lignes ci-dessous.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-line">
                <table className="tbl">
                  <thead><tr><th>Matériel repris</th><th className="num">Pièces</th><th className="num">Coût d’achat</th></tr></thead>
                  <tbody>{billable.map((m) => <tr key={m.id}><td>{m.name}</td><td className="num">{num(m.quantity)} {m.unit}</td><td className="num">{money(round2((m.unitCost ?? 0) * m.quantity))}</td></tr>)}</tbody>
                </table>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Marge sur le matériel (%)" htmlFor="g-markup" hint="0 = refacturé au prix d’achat."><input id="g-markup" required inputMode="decimal" className={inputClass} value={markup} onChange={(e) => setMarkup(e.target.value)} /></Field>
              <Field label="Échéance de paiement" htmlFor="g-due"><input id="g-due" type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Main-d’œuvre, déplacement, autres lignes</p>
              {extras.map((e, i) => (
                <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[1fr_4.5rem_5.5rem_7rem_auto] sm:items-center">
                  <input aria-label="Désignation" required className={inputClass} value={e.description} onChange={(ev) => setExtra(i, 'description', ev.target.value)} />
                  <input aria-label="Unité" className={inputClass} value={e.unit} onChange={(ev) => setExtra(i, 'unit', ev.target.value)} />
                  <input aria-label="Quantité" inputMode="decimal" className={`${inputClass} text-right`} value={e.quantity} onChange={(ev) => setExtra(i, 'quantity', ev.target.value)} />
                  <input aria-label="Prix unitaire" inputMode="decimal" required className={`${inputClass} text-right`} placeholder="Prix" value={e.unitPrice} onChange={(ev) => setExtra(i, 'unitPrice', ev.target.value)} />
                  <IconButton icon="trash" tone="danger" label="Retirer la ligne" onClick={() => setExtras((l) => l.filter((_, j) => j !== i))} />
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" icon="plus" onClick={() => setExtras((l) => [...l, { ...emptyExtra }])}>Main-d’œuvre</Button>
                <Button size="sm" variant="secondary" icon="plus" onClick={() => setExtras((l) => [...l, { description: 'Déplacement', unit: 'forfait', quantity: '1', unitPrice: '' }])}>Déplacement</Button>
                <Button size="sm" variant="secondary" icon="plus" onClick={() => setExtras((l) => [...l, { description: '', unit: 'u', quantity: '1', unitPrice: '' }])}>Ligne libre</Button>
              </div>
            </div>

            <Field label="Notes (facultatif)" htmlFor="g-notes"><textarea id="g-notes" rows={2} maxLength={2000} className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            <p className="text-sm text-ink/60">Matériel avec marge : {money(preview.mat)}. Le serveur recalcule les montants et fait foi.</p>
          </>
        )}
      </form>
    </Modal>
  )
}
