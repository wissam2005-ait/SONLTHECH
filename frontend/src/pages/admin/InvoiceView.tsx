import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DocumentForm from '../../components/DocumentForm'
import { Field, inputClass } from '../../components/Field'
import PrintedDocument from '../../components/PrintedDocument'
import { Button, ErrorBanner, IconButton, Loading, Modal, PageHeader, Section, Stat, useToast } from '../../components/ui'
import { dateFr, money, parseNum, todayIso } from '../../lib/format'
import { api } from '../../lib/http'
import { downloadXlsx } from '../../lib/xlsx'
import { useCompany } from '../../lib/company'
import type { Client, Invoice, Project } from '../../lib/types'
import { InvoiceBadge, isLate } from './Invoices'

export const paymentMethods = ['Espèces', 'Chèque', 'Virement bancaire', 'Virement CCP']

export default function InvoiceView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const company = useCompany()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => { api<Invoice>(`/invoices/${id}`).then(setInvoice).catch((e: Error) => setError(e.message)) }, [id])
  useEffect(() => {
    load()
    api<Client[]>('/clients').then(setClients).catch(() => undefined)
    api<Project[]>('/projects').then(setProjects).catch(() => undefined)
  }, [load])

  async function issue() {
    if (!window.confirm('Émettre la facture ? Elle recevra son numéro définitif et ne pourra plus être modifiée ni supprimée.')) return
    try { setInvoice(await api<Invoice>(`/invoices/${id}/issue`, { method: 'POST', json: {} })); toast('Facture émise') } catch (e) { setError((e as Error).message) }
  }

  async function removeDraft() {
    if (!window.confirm('Supprimer ce brouillon ? Son matériel éventuel redeviendra facturable.')) return
    try { await api(`/invoices/${id}`, { method: 'DELETE' }); toast('Brouillon supprimé'); navigate('/admin/factures') } catch (e) { setError((e as Error).message) }
  }

  async function removePayment(pid: number) {
    if (!window.confirm('Supprimer ce paiement ?')) return
    try { setInvoice(await api<Invoice>(`/invoices/${id}/payments/${pid}`, { method: 'DELETE' })); toast('Paiement supprimé') } catch (e) { setError((e as Error).message) }
  }

  if (error && !invoice) return <ErrorBanner message={error} />
  if (!invoice) return <Loading />
  const draft = invoice.status === 'DRAFT'
  const client = clients.find((c) => c.id === invoice.clientId) ?? null
  const project = projects.find((p) => p.id === invoice.projectId) ?? null

  return (
    <div>
      <div className="print:hidden">
        <PageHeader back={{ to: '/admin/factures', label: 'Factures' }}
          title={invoice.number ?? `Brouillon n°${invoice.id}`}
          subtitle={<span className="flex flex-wrap items-center gap-2">
            <InvoiceBadge invoice={invoice} />
            {invoice.title && <span>{invoice.title}</span>}
            {invoice.paidOn && <span>soldée le {dateFr(invoice.paidOn)}</span>}
            {isLate(invoice) && <span className="text-wire-red">échéance dépassée depuis le {dateFr(invoice.dueDate)}</span>}
            {invoice.quoteId && <Link to={`/admin/devis/${invoice.quoteId}`} className="underline">voir le devis d’origine</Link>}
          </span>}
          actions={<>
            {draft && <Button variant="danger" icon="trash" onClick={removeDraft}>Supprimer</Button>}
            {draft && <Button variant="secondary" icon="edit" onClick={() => setEditOpen(true)}>Modifier</Button>}
            {draft && <Button icon="check" onClick={issue}>Émettre la facture</Button>}
            {invoice.status === 'SENT' && <Button variant="volt" icon="euro" onClick={() => setPayOpen(true)}>Enregistrer un paiement</Button>}
            <Button variant="secondary" icon="sheet" onClick={() => downloadXlsx({ kind: 'invoice', fileName: `Facture_${invoice.number ?? `brouillon_${invoice.id}`}`, number: invoice.number,
              issueDate: invoice.issueDate, title: invoice.title, subtitle: invoice.subtitle, clientName: client?.name ?? '', companyName: company.name, vatRate: invoice.vatRate, lines: invoice.lines })}>Export Excel</Button>
            <Button variant="secondary" icon="print" onClick={() => window.print()}>Imprimer / PDF</Button>
          </>} />
        <ErrorBanner message={error} onClose={() => setError('')} />
        {draft && <p className="mb-4 text-sm text-ink/60">Brouillon : le numéro et la date sont attribués à l’émission. Les coordonnées de l’entreprise imprimées sur la facture se règlent dans <Link to="/admin/parametres" className="underline">Paramètres</Link>.</p>}

        {!draft && (
          <div className="mb-6 grid gap-5 lg:grid-cols-3">
            <div className="grid gap-3 sm:grid-cols-3 lg:col-span-3">
              <Stat label="Total" value={money(invoice.totalTtc)} />
              <Stat label="Déjà payé" value={money(invoice.paidAmount)} tone={invoice.paidAmount > 0 ? 'green' : undefined} />
              <Stat label="Reste à payer" value={money(invoice.remaining)} tone={invoice.remaining > 0 ? (isLate(invoice) ? 'red' : 'amber') : 'green'} />
            </div>
            <Section title="Paiements reçus" className="lg:col-span-3"
              actions={invoice.status === 'SENT' && <Button size="sm" icon="plus" onClick={() => setPayOpen(true)}>Paiement</Button>}>
              {invoice.payments.length === 0 ? <p className="text-ink/55">Aucun paiement pour l’instant. Enregistrez les acomptes au fur et à mesure : le reste à payer se calcule tout seul.</p> : (
                <div className="overflow-x-auto">
                  <table className="tbl">
                    <thead><tr><th>Date</th><th>Moyen</th><th>Note</th><th className="num">Montant</th><th /></tr></thead>
                    <tbody>
                      {invoice.payments.map((p) => (
                        <tr key={p.id}>
                          <td>{dateFr(p.paidOn)}</td><td>{p.method}</td><td className="text-ink/65">{p.note}</td>
                          <td className="num font-semibold">{money(p.amount)}</td>
                          <td className="text-right"><IconButton icon="trash" tone="danger" label="Supprimer ce paiement" onClick={() => removePayment(p.id)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        )}
      </div>

      <PrintedDocument kind="invoice" number={invoice.number} issueDate={invoice.issueDate} secondDate={invoice.dueDate} title={invoice.title} subtitle={invoice.subtitle}
        client={client} project={project} lines={invoice.lines} vatRate={invoice.vatRate} totalHt={invoice.totalHt} totalVat={invoice.totalVat}
        totalTtc={invoice.totalTtc} notes={invoice.notes} paidAmount={invoice.status === 'DRAFT' ? 0 : invoice.paidAmount} />

      <DocumentForm kind="invoice" open={editOpen} doc={invoice} clients={clients} projects={projects} onClose={() => setEditOpen(false)}
        onSaved={(d) => { setInvoice(d as Invoice); setEditOpen(false); toast('Brouillon enregistré') }} />
      <InvoicePaymentModal open={payOpen} invoice={invoice} onClose={() => setPayOpen(false)}
        onSaved={(inv) => { setInvoice(inv); setPayOpen(false); toast(inv.status === 'PAID' ? 'Facture soldée' : 'Acompte enregistré') }} />
    </div>
  )
}

function InvoicePaymentModal({ open, invoice, onClose, onSaved }: { open: boolean; invoice: Invoice; onClose: () => void; onSaved: (i: Invoice) => void }) {
  const [f, setF] = useState({ amount: '', paidOn: todayIso(), method: 'Espèces', note: '' })
  const [error, setError] = useState('')
  useEffect(() => { if (open) { setF({ amount: String(invoice.remaining), paidOn: todayIso(), method: 'Espèces', note: '' }); setError('') } }, [open, invoice.remaining])

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const amount = parseNum(f.amount)
    if (!(amount > 0)) { setError('Montant invalide.'); return }
    try { onSaved(await api<Invoice>(`/invoices/${invoice.id}/payments`, { method: 'POST', json: { ...f, amount } })) } catch (e) { setError((e as Error).message) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Paiement reçu"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button type="submit" form="inv-pay-form">Enregistrer</Button></>}>
      <form id="inv-pay-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><ErrorBanner message={error} /></div>
        <p className="text-sm text-ink/60 sm:col-span-2">Reste à payer : <strong className="text-ink">{money(invoice.remaining)}</strong>. Pour un acompte, saisissez un montant plus petit.</p>
        <Field label="Montant reçu (DA)" htmlFor="ip-amount"><input id="ip-amount" required inputMode="decimal" className={inputClass} value={f.amount} onChange={(e) => setF((x) => ({ ...x, amount: e.target.value }))} /></Field>
        <Field label="Date" htmlFor="ip-date"><input id="ip-date" type="date" required className={inputClass} value={f.paidOn} onChange={(e) => setF((x) => ({ ...x, paidOn: e.target.value }))} /></Field>
        <Field label="Moyen de paiement" htmlFor="ip-method">
          <select id="ip-method" className={inputClass} value={f.method} onChange={(e) => setF((x) => ({ ...x, method: e.target.value }))}>{paymentMethods.map((m) => <option key={m}>{m}</option>)}</select>
        </Field>
        <Field label="Note" htmlFor="ip-note"><input id="ip-note" maxLength={300} className={inputClass} placeholder="Acompte 30 %, n° de chèque…" value={f.note} onChange={(e) => setF((x) => ({ ...x, note: e.target.value }))} /></Field>
      </form>
    </Modal>
  )
}
