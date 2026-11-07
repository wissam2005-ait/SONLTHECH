import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/http'
import { dateFr, money, num, parseNum, round2, todayIso } from '../lib/format'
import type { CatalogItem, Material, Project } from '../lib/types'
import { Field, inputClass } from './Field'
import { Badge, Button, EmptyState, ErrorBanner, IconButton, Modal, useToast } from './ui'

export const units = ['u', 'm', 'ml', 'm²', 'kg', 'lot', 'boîte', 'rouleau', 'h']

interface Props {
  projectId: number | null    // null = tous les chantiers (dirigeant)
  projects?: Project[]        // pour afficher le nom du chantier en vue « tous »
  isAdmin: boolean
  onChange?: (items: Material[]) => void
}

/**
 * Le matériel d'un chantier présenté comme une feuille de calcul :
 * désignation, nombre de pièces, unité, prix unitaire, total. Saisie rapide sur la dernière ligne.
 */
export default function MaterialTable({ projectId, projects = [], isAdmin, onChange }: Props) {
  const toast = useToast()
  const [items, setItems] = useState<Material[] | null>(null)
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [row, setRow] = useState({ name: '', quantity: '1', unit: 'u', unitCost: '' })
  const [editing, setEditing] = useState<Material | null>(null)
  const [filter, setFilter] = useState<'all' | 'toBuy' | 'bought'>('all')
  const [error, setError] = useState('')

  const changeRef = useRef(onChange)
  changeRef.current = onChange
  const load = useCallback(() => {
    api<Material[]>(projectId ? `/materials?projectId=${projectId}` : '/materials')
      .then((l) => { setItems(l); changeRef.current?.(l) })
      .catch((e: Error) => setError(e.message))
  }, [projectId])
  useEffect(load, [load])
  useEffect(() => { api<CatalogItem[]>('/catalog').then(setCatalog).catch(() => undefined) }, [])

  const list = items ?? []
  const shown = list.filter((m) => filter === 'all' || (filter === 'toBuy' ? !m.purchasedOn : !!m.purchasedOn))
  const total = list.reduce((s, m) => s + round2((m.unitCost ?? 0) * m.quantity), 0)
  const toBuy = list.filter((m) => !m.purchasedOn).length
  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? `Chantier n°${id}`

  const catalogByName = useMemo(() => new Map(catalog.map((c) => [c.name.toLowerCase(), c])), [catalog])

  function onNameChange(name: string) {
    const c = catalogByName.get(name.trim().toLowerCase())
    setRow((r) => ({ ...r, name, ...(c ? { unit: c.unit, unitCost: isAdmin && c.unitPrice != null ? String(c.unitPrice) : r.unitCost } : {}) }))
  }

  async function onAdd(ev: FormEvent) {
    ev.preventDefault()
    if (!projectId) return
    const quantity = parseNum(row.quantity)
    if (!(quantity > 0)) { setError('Nombre de pièces invalide.'); return }
    const unitCost = isAdmin && row.unitCost.trim() !== '' ? parseNum(row.unitCost) : null
    if (unitCost !== null && !(unitCost >= 0)) { setError('Prix unitaire invalide.'); return }
    setError('')
    try {
      const supplier = catalogByName.get(row.name.trim().toLowerCase())?.supplier ?? null
      await api('/materials', { method: 'POST', json: { projectId, name: row.name, unit: row.unit, quantity, unitCost, supplier } })
      setRow((r) => ({ name: '', quantity: '1', unit: r.unit, unitCost: '' }))
      document.getElementById('mt-name')?.focus()
      load()
    } catch (e) { setError((e as Error).message) }
  }

  async function remove(m: Material) {
    if (!window.confirm(`Retirer « ${m.name} » de la liste ?`)) return
    try { await api(`/materials/${m.id}`, { method: 'DELETE' }); toast('Matériel retiré'); load() } catch (e) { setError((e as Error).message) }
  }

  function status(m: Material) {
    if (m.invoiceId) return <Badge tone="green" dot>Facturé</Badge>
    if (m.purchasedOn) return <Badge tone="blue" dot>Acheté</Badge>
    return <Badge tone="amber" dot>À acheter</Badge>
  }

  const editable = (m: Material) => !m.invoiceId && (isAdmin || !m.purchasedOn)
  const cols = (projectId ? 0 : 1) + (isAdmin ? 7 : 5)

  return (
    <div>
      <ErrorBanner message={error} onClose={() => setError('')} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer le matériel">
          {([['all', 'Tout', list.length], ['toBuy', 'À acheter', toBuy], ['bought', 'Acheté', list.length - toBuy]] as const).map(([id, label, count]) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}
              className={`h-8 rounded-full border px-3 text-sm font-semibold ${filter === id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink/70 hover:border-ink/40'}`}>
              {label} <span className={filter === id ? 'text-volt' : 'text-ink/45'}>{count}</span>
            </button>
          ))}
        </div>
        {isAdmin && <p className="text-sm text-ink/60">Total matériel : <strong className="font-display text-xl text-ink">{money(total)}</strong></p>}
      </div>

      {list.length === 0 && !projectId ? (
        <EmptyState icon="box" title="Aucun matériel saisi" text="Ouvrez un chantier pour y ajouter le matériel utilisé." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-lift">
          <table className="tbl">
            <thead>
              <tr>
                {!projectId && <th>Chantier</th>}
                <th className="min-w-[14rem]">Désignation</th>
                <th className="num">Pièces</th>
                <th>Unité</th>
                {isAdmin && <th className="num">Prix unitaire</th>}
                {isAdmin && <th className="num">Total</th>}
                <th>État</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.id}>
                  {!projectId && <td><Link to={`/admin/chantiers/${m.projectId}`} className="font-medium hover:underline">{projectName(m.projectId)}</Link></td>}
                  <td>
                    <p className="font-medium">{m.name}</p>
                    {isAdmin && (m.supplier || m.purchasedOn) && <p className="text-xs text-ink/50">{[m.supplier, m.purchasedOn && `acheté le ${dateFr(m.purchasedOn)}`].filter(Boolean).join(', ')}</p>}
                  </td>
                  <td className="num font-semibold">{num(m.quantity)}</td>
                  <td>{m.unit}</td>
                  {isAdmin && <td className="num">{m.unitCost != null ? money(m.unitCost) : <span className="text-ink/35">—</span>}</td>}
                  {isAdmin && <td className="num font-semibold">{m.unitCost != null ? money(round2(m.unitCost * m.quantity)) : <span className="text-ink/35">—</span>}</td>}
                  <td>{status(m)}</td>
                  <td>
                    <div className="flex justify-end">
                      {editable(m) && <IconButton icon="edit" label={`Modifier ${m.name}`} onClick={() => setEditing(m)} />}
                      {editable(m) && <IconButton icon="trash" tone="danger" label={`Retirer ${m.name}`} onClick={() => remove(m)} />}
                    </div>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && list.length > 0 && <tr><td colSpan={cols} className="py-6 text-center text-ink/50">Rien dans ce filtre.</td></tr>}
            </tbody>
            {projectId && (
              <tfoot>
                <tr>
                  <td colSpan={cols} className="!border-t !border-line bg-volt/[.08] !p-2">
                    <form onSubmit={onAdd} className={`grid items-end gap-2 ${isAdmin ? 'sm:grid-cols-[1fr_6rem_7rem_8rem_auto]' : 'sm:grid-cols-[1fr_6rem_7rem_auto]'}`}>
                      <Field label="Désignation" htmlFor="mt-name">
                        <input id="mt-name" required maxLength={200} list="mt-catalog" autoComplete="off" className={inputClass} placeholder="Câble R2V 3G2,5, disjoncteur 16 A…" value={row.name} onChange={(e) => onNameChange(e.target.value)} />
                        <datalist id="mt-catalog">{catalog.map((c) => <option key={c.id} value={c.name}>{c.reference ?? ''}</option>)}</datalist>
                      </Field>
                      <Field label="Pièces" htmlFor="mt-qty"><input id="mt-qty" required inputMode="decimal" className={`${inputClass} text-right`} value={row.quantity} onChange={(e) => setRow((r) => ({ ...r, quantity: e.target.value }))} /></Field>
                      <Field label="Unité" htmlFor="mt-unit">
                        <select id="mt-unit" className={inputClass} value={row.unit} onChange={(e) => setRow((r) => ({ ...r, unit: e.target.value }))}>
                          {[...new Set([...units, row.unit])].map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </Field>
                      {isAdmin && <Field label="Prix unitaire" htmlFor="mt-cost"><input id="mt-cost" inputMode="decimal" className={`${inputClass} text-right`} placeholder="à acheter" value={row.unitCost} onChange={(e) => setRow((r) => ({ ...r, unitCost: e.target.value }))} /></Field>}
                      <Button type="submit" icon="plus">Ajouter</Button>
                    </form>
                    <p className="mt-1.5 px-1 text-xs text-ink/55">
                      {isAdmin ? 'Les pièces du catalogue remplissent l’unité et le prix automatiquement. Sans prix, la ligne reste « à acheter ».' : 'Les pièces du catalogue sont proposées pendant la saisie.'}
                    </p>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <MaterialEdit material={editing} isAdmin={isAdmin} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); toast('Matériel enregistré'); load() }} />
    </div>
  )
}

function MaterialEdit({ material, isAdmin, onClose, onSaved }: { material: Material | null; isAdmin: boolean; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', quantity: '', unit: 'u', unitCost: '', supplier: '', purchasedOn: '' })
  const [error, setError] = useState('')
  useEffect(() => {
    if (!material) return
    setError('')
    setF({ name: material.name, quantity: String(material.quantity), unit: material.unit, unitCost: material.unitCost != null ? String(material.unitCost) : '', supplier: material.supplier ?? '', purchasedOn: material.purchasedOn ?? '' })
  }, [material])

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!material) return
    const quantity = parseNum(f.quantity)
    const unitCost = f.unitCost.trim() === '' ? null : parseNum(f.unitCost)
    if (!(quantity > 0)) { setError('Nombre de pièces invalide.'); return }
    if (unitCost !== null && !(unitCost >= 0)) { setError('Prix invalide.'); return }
    try {
      await api(`/materials/${material.id}`, { method: 'PUT', json: { name: f.name, unit: f.unit, quantity, unitCost, supplier: f.supplier, purchasedOn: unitCost === null ? null : f.purchasedOn || todayIso() } })
      onSaved()
    } catch (e) { setError((e as Error).message) }
  }

  const q = parseNum(f.quantity) || 0
  const c = parseNum(f.unitCost) || 0
  return (
    <Modal open={material !== null} onClose={onClose} title="Modifier le matériel"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button type="submit" form="mat-form">Enregistrer</Button></>}>
      <form id="mat-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><ErrorBanner message={error} /></div>
        <Field label="Désignation" htmlFor="me-name" className="sm:col-span-2"><input id="me-name" required maxLength={200} className={inputClass} value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} /></Field>
        <Field label="Nombre de pièces" htmlFor="me-qty"><input id="me-qty" required inputMode="decimal" className={inputClass} value={f.quantity} onChange={(e) => setF((x) => ({ ...x, quantity: e.target.value }))} /></Field>
        <Field label="Unité" htmlFor="me-unit">
          <select id="me-unit" className={inputClass} value={f.unit} onChange={(e) => setF((x) => ({ ...x, unit: e.target.value }))}>
            {[...new Set([...units, f.unit])].map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>
        {isAdmin && (
          <>
            <Field label="Prix unitaire (DA)" htmlFor="me-cost" hint="Laisser vide si pas encore acheté."><input id="me-cost" inputMode="decimal" className={inputClass} value={f.unitCost} onChange={(e) => setF((x) => ({ ...x, unitCost: e.target.value }))} /></Field>
            <Field label="Date d’achat" htmlFor="me-date"><input id="me-date" type="date" disabled={f.unitCost.trim() === ''} className={inputClass} value={f.purchasedOn} onChange={(e) => setF((x) => ({ ...x, purchasedOn: e.target.value }))} /></Field>
            <Field label="Fournisseur" htmlFor="me-sup" className="sm:col-span-2"><input id="me-sup" maxLength={150} disabled={f.unitCost.trim() === ''} className={inputClass} placeholder="Nom du fournisseur" value={f.supplier} onChange={(e) => setF((x) => ({ ...x, supplier: e.target.value }))} /></Field>
            <p className="text-sm text-ink/60 sm:col-span-2">Total : <strong className="text-ink">{money(round2(q * c))}</strong></p>
          </>
        )}
      </form>
    </Modal>
  )
}
