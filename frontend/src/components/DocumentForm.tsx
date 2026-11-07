import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { api } from '../lib/http'
import { isoDay, money, parseNum, round2 } from '../lib/format'
import { amount2, priced } from '../lib/lines'
import type { CatalogItem, Client, Invoice, LineKind, Project, Quote } from '../lib/types'
import { Field, inputClass } from './Field'
import { Button, ErrorBanner, IconButton, Modal } from './ui'

export interface EditLine { kind: LineKind; description: string; unit: string; quantity: string; unitPrice: string }
const line = (kind: LineKind = 'ITEM', description = '', unit = 'U', quantity = '1', unitPrice = ''): EditLine => ({ kind, description, unit, quantity, unitPrice })
const blankLine = () => line()
const units = ['U', 'ML', 'M²', 'M³', 'ENS', 'FF', 'jour', 'h', 'kg']
const kindLabels: Record<LineKind, string> = { ITEM: 'Article', SUBITEM: 'Sous-ligne', GROUP: 'Titre d’article', SECTION: 'Titre de lot' }

/** Valeurs de départ (nouveau document depuis un chantier, un client…). */
export interface Preset { clientId?: number; projectId?: number; title?: string }

interface Props {
  kind: 'invoice' | 'quote'
  open: boolean
  doc: Invoice | Quote | null        // null = création
  preset?: Preset
  clients: Client[]
  projects: Project[]
  onClose: () => void
  onSaved: (saved: Invoice | Quote) => void
}

/**
 * Saisie d'une facture libre ou d'un devis, ligne par ligne comme sur un tableur :
 * désignation, unité, quantité, prix unitaire, montant. Les pièces du catalogue sont proposées.
 */
/** Lettre de la sous-ligne i (a, b, c…), comptée depuis le dernier titre d'article. */
function subLetter(lines: EditLine[], i: number) {
  let n = 0
  for (let j = i - 1; j >= 0 && lines[j].kind === 'SUBITEM'; j--) n++
  return 'abcdefghijklmnopqrstuvwxyz'[n % 26]
}

export default function DocumentForm({ kind, open, doc, preset, clients, projects, onClose, onSaved }: Props) {
  const isQuote = kind === 'quote'
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [head, setHead] = useState({ clientId: '', projectId: '', title: '', subtitle: '', date: '', notes: '' })
  const [lines, setLines] = useState<EditLine[]>([blankLine()])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (open && catalog.length === 0) api<CatalogItem[]>('/catalog').then(setCatalog).catch(() => undefined) }, [open, catalog.length])

  // preset et projects sont lus à l'ouverture seulement : la saisie n'est jamais réinitialisée en cours de route
  const startRef = useRef({ preset, projects })
  startRef.current = { preset, projects }
  useEffect(() => {
    if (!open) return
    const { preset, projects } = startRef.current
    setError('')
    const in30 = new Date(); in30.setDate(in30.getDate() + 30)
    if (doc) {
      setHead({
        clientId: String(doc.clientId), projectId: doc.projectId ? String(doc.projectId) : '', title: doc.title ?? '', subtitle: doc.subtitle ?? '',
        notes: doc.notes ?? '',
        date: ('validUntil' in doc ? doc.validUntil : doc.dueDate) ?? '',
      })
      setLines(doc.lines.map((l) => line(l.kind, l.description, l.unit ?? '', priced(l.kind) ? String(l.quantity) : '', priced(l.kind) ? String(l.unitPrice) : '')))
    } else {
      const p = projects.find((x) => x.id === preset?.projectId)
      setHead({
        clientId: String(preset?.clientId ?? p?.clientId ?? ''), projectId: p ? String(p.id) : '', title: preset?.title ?? p?.name ?? '', subtitle: '',
        date: isoDay(in30), notes: '',
      })
      setLines([blankLine()])
    }
  }, [open, doc])

  const clientProjects = projects.filter((p) => String(p.clientId) === head.clientId)
  const catalogByName = useMemo(() => new Map(catalog.map((c) => [c.name.toLowerCase(), c])), [catalog])

  const totals = useMemo(() => {
    const ht = round2(lines.filter((l) => priced(l.kind)).reduce((s, l) => s + round2((parseNum(l.quantity) || 0) * (parseNum(l.unitPrice) || 0)), 0))
    return { ht }
  }, [lines])

  function setLine(i: number, k: keyof EditLine, v: string) {
    setLines((list) => list.map((l, j) => {
      if (j !== i) return l
      const next = { ...l, [k]: v } as EditLine
      if (k === 'description') {
        const c = catalogByName.get(v.trim().toLowerCase())
        if (c) { next.unit = c.unit; if (!l.unitPrice && c.unitPrice != null) next.unitPrice = String(c.unitPrice) }
      }
      return next
    }))
  }

  function move(i: number, d: number) {
    setLines((x) => { const y = [...x]; const [r] = y.splice(i, 1); y.splice(i + d, 0, r); return y })
  }
  // Ajoute les lignes en remplaçant la dernière si elle est vide (formulaire neuf)
  function add(newLines: EditLine[]) {
    setLines((x) => (x.length === 1 && !x[0].description.trim() && !x[0].unitPrice ? newLines : [...x, ...newLines]))
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError('')
    const filled = lines.filter((l) => l.description.trim())
    if (!filled.some((l) => priced(l.kind))) { setError('Ajoutez au moins une ligne chiffrée.'); return }
    for (const l of filled.filter((x) => priced(x.kind))) {
      if (!(parseNum(l.quantity) > 0)) { setError(`Quantité invalide pour « ${l.description} ».`); return }
      if (!(parseNum(l.unitPrice) >= 0) || l.unitPrice.trim() === '') { setError(`Prix manquant pour « ${l.description} ».`); return }
    }
    const json = {
      clientId: Number(head.clientId), projectId: head.projectId ? Number(head.projectId) : null, title: head.title, subtitle: head.subtitle,
      vatRate: 0, notes: head.notes,
      ...(isQuote ? { validUntil: head.date || null } : { dueDate: head.date || null }),
      lines: filled.map((l) => priced(l.kind)
        ? { kind: l.kind, description: l.description, unit: l.unit, quantity: parseNum(l.quantity), unitPrice: parseNum(l.unitPrice) }
        : { kind: l.kind, description: l.description }),
    }
    const base = isQuote ? '/quotes' : '/invoices'
    setBusy(true)
    try {
      const saved = await api<Invoice | Quote>(doc ? `${base}/${doc.id}` : base, { method: doc ? 'PUT' : 'POST', json })
      onSaved(saved)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  const title = doc ? (isQuote ? `Modifier le devis ${(doc as Quote).number}` : 'Modifier le brouillon') : isQuote ? 'Nouveau devis' : 'Nouvelle facture'

  return (
    <Modal open={open} onClose={onClose} wide xl title={title}
      footer={<>
        <p className="mr-auto self-center text-sm">Total : <strong className="font-display text-xl">{money(totals.ht)}</strong></p>
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button type="submit" form="doc-form" disabled={busy}>{doc ? 'Enregistrer' : isQuote ? 'Créer le devis' : 'Créer le brouillon'}</Button>
      </>}>
      <form id="doc-form" onSubmit={onSubmit} className="space-y-5">
        <ErrorBanner message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client" htmlFor="d-client" hint={clients.length === 0 ? 'Créez d’abord un client dans la page Clients.' : undefined}>
            <select id="d-client" required className={inputClass} value={head.clientId}
              onChange={(e) => setHead((h) => ({ ...h, clientId: e.target.value, projectId: '' }))}>
              <option value="">Choisir…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Chantier (facultatif)" htmlFor="d-project">
            <select id="d-project" className={inputClass} value={head.projectId} disabled={!head.clientId}
              onChange={(e) => { const p = projects.find((x) => String(x.id) === e.target.value); setHead((h) => ({ ...h, projectId: e.target.value, title: h.title || (p?.name ?? '') })) }}>
              <option value="">Aucun : {isQuote ? 'devis' : 'facture'} libre</option>
              {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Objet (titre encadré en haut du document)" htmlFor="d-title" className="sm:col-span-2">
            <input id="d-title" maxLength={200} className={inputClass} placeholder="Reste à réaliser des travaux du nouveau siège de…" value={head.title} onChange={(e) => setHead((h) => ({ ...h, title: e.target.value }))} />
          </Field>
          <Field label="Sous-titre (facultatif)" htmlFor="d-subtitle" className="sm:col-span-2">
            <input id="d-subtitle" maxLength={300} className={inputClass} placeholder="02- BATIMENT" value={head.subtitle} onChange={(e) => setHead((h) => ({ ...h, subtitle: e.target.value }))} />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink/85">Lignes du devis quantitatif et estimatif</p>
          <div className="hidden gap-2 px-1 pb-1 text-xs font-semibold text-ink/55 md:grid md:grid-cols-[9rem_1fr_4.5rem_5.5rem_7rem_7.5rem_6.5rem]">
            <span>Type</span><span>Désignation des travaux</span><span>Unité</span><span className="text-right">Quantité</span><span className="text-right">Prix unitaire</span><span className="text-right">Montant (DA)</span><span />
          </div>
          <div className="space-y-1.5">
            {lines.map((l, i) => {
              const isPriced = priced(l.kind)
              const rowCls = l.kind === 'SECTION' ? 'bg-ink/[.07] rounded-md p-1.5' : l.kind === 'GROUP' ? 'bg-panel rounded-md p-1.5' : 'p-0'
              return (
                <div key={i} className={`grid gap-2 border-b border-line pb-2 md:grid-cols-[9rem_1fr_4.5rem_5.5rem_7rem_7.5rem_6.5rem] md:items-center md:border-0 md:pb-0 ${rowCls}`}>
                  <select aria-label={`Type de la ligne ${i + 1}`} className={`${inputClass} !px-2 text-sm`} value={l.kind} onChange={(e) => setLine(i, 'kind', e.target.value)}>
                    {(Object.keys(kindLabels) as LineKind[]).map((k) => <option key={k} value={k}>{kindLabels[k]}</option>)}
                  </select>
                  <div className={`flex items-center gap-2 ${isPriced ? '' : 'md:col-span-5'}`}>
                    {l.kind === 'SUBITEM' && <span className="w-6 shrink-0 text-right text-sm font-semibold text-ink/50">{subLetter(lines, i)}/</span>}
                    <input aria-label={`Désignation ligne ${i + 1}`} maxLength={300} list="doc-catalog"
                      className={`${inputClass} ${l.kind === 'SECTION' ? 'text-center font-bold uppercase' : l.kind === 'GROUP' ? 'font-semibold' : ''}`}
                      placeholder={l.kind === 'SECTION' ? 'LOT 03 : ÉLECTRICITÉ' : l.kind === 'GROUP' ? 'F/P de Prise de Courant' : l.kind === 'SUBITEM' ? '2P+T 16 A' : 'F/P de Plafonnier 2x36 W, main-d’œuvre…'}
                      value={l.description} onChange={(e) => setLine(i, 'description', e.target.value)} />
                  </div>
                  {isPriced && <>
                    <input aria-label="Unité" maxLength={20} list="doc-units" className={inputClass} value={l.unit} onChange={(e) => setLine(i, 'unit', e.target.value)} />
                    <input aria-label="Quantité" inputMode="decimal" className={`${inputClass} text-right`} value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} />
                    <input aria-label="Prix unitaire" inputMode="decimal" className={`${inputClass} text-right`} placeholder="0" value={l.unitPrice} onChange={(e) => setLine(i, 'unitPrice', e.target.value)} />
                    <span className="whitespace-nowrap text-right font-semibold tabular-nums">{amount2(round2((parseNum(l.quantity) || 0) * (parseNum(l.unitPrice) || 0)))}</span>
                  </>}
                  <div className="flex justify-end">
                    <IconButton icon="up" label="Monter la ligne" disabled={i === 0} onClick={() => move(i, -1)} />
                    <IconButton icon="down" label="Descendre la ligne" disabled={i === lines.length - 1} onClick={() => move(i, 1)} />
                    <IconButton icon="trash" tone="danger" label={`Retirer la ligne ${i + 1}`} onClick={() => setLines((x) => (x.length === 1 ? [blankLine()] : x.filter((_, j) => j !== i)))} />
                  </div>
                </div>
              )
            })}
          </div>
          <datalist id="doc-catalog">{catalog.map((c) => <option key={c.id} value={c.name} />)}</datalist>
          <datalist id="doc-units">{units.map((u) => <option key={u} value={u} />)}</datalist>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon="plus" onClick={() => add([line('SECTION')])}>Titre de lot</Button>
            <Button size="sm" variant="secondary" icon="plus" onClick={() => add([line()])}>Article</Button>
            <Button size="sm" variant="secondary" icon="plus" onClick={() => add([line('GROUP'), line('SUBITEM'), line('SUBITEM')])}>Article à sous-lignes</Button>
            <Button size="sm" variant="secondary" icon="plus" onClick={() => add([line('SUBITEM')])}>Sous-ligne</Button>
            <Button size="sm" variant="secondary" icon="plus" onClick={() => add([line('ITEM', 'Main-d’œuvre', 'jour')])}>Main-d’œuvre</Button>
          </div>
          <p className="mt-1.5 text-xs text-ink/55">
            « Article à sous-lignes » : une désignation sans quantité (ex. F/P de Prise de Courant) suivie de sous-lignes a/, b/, c/ chiffrées.
            {catalog.length > 0 && ' Les pièces du catalogue remplissent l’unité et le prix d’achat : ajustez votre prix de vente.'}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={isQuote ? 'Valable jusqu’au' : 'Échéance de paiement'} htmlFor="d-date">
            <input id="d-date" type="date" className={inputClass} value={head.date} onChange={(e) => setHead((h) => ({ ...h, date: e.target.value }))} />
          </Field>
          <Field label="Notes" htmlFor="d-notes"><input id="d-notes" maxLength={2000} className={inputClass} placeholder={isQuote ? 'Délai, conditions…' : 'Conditions de paiement…'} value={head.notes} onChange={(e) => setHead((h) => ({ ...h, notes: e.target.value }))} /></Field>
        </div>
      </form>
    </Modal>
  )
}
