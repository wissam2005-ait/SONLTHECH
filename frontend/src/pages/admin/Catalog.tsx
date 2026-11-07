import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Field, inputClass } from '../../components/Field'
import { units } from '../../components/MaterialTable'
import { Button, EmptyState, ErrorBanner, IconButton, Loading, Modal, PageHeader, SearchInput, useToast } from '../../components/ui'
import { money, parseNum } from '../../lib/format'
import { api } from '../../lib/http'
import type { CatalogItem } from '../../lib/types'

const empty = { name: '', reference: '', unit: 'u', unitPrice: '', supplier: '' }

/** Les pièces habituelles et leur prix d'achat : remplace l'onglet « tarifs » du tableur. */
export default function Catalog() {
  const toast = useToast()
  const [items, setItems] = useState<CatalogItem[] | null>(null)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<CatalogItem | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const load = useCallback(() => { api<CatalogItem[]>('/catalog').then(setItems).catch((e: Error) => setError(e.message)) }, [])
  useEffect(load, [load])

  const shown = useMemo(() => (items ?? []).filter((i) => !q.trim() || `${i.name} ${i.reference ?? ''} ${i.supplier ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())), [items, q])

  function openForm(i: CatalogItem | null) {
    setEditing(i)
    setFormError('')
    setForm(i ? { name: i.name, reference: i.reference ?? '', unit: i.unit, unitPrice: i.unitPrice != null ? String(i.unitPrice) : '', supplier: i.supplier ?? '' } : empty)
    setOpen(true)
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const unitPrice = form.unitPrice.trim() === '' ? null : parseNum(form.unitPrice)
    if (unitPrice !== null && !(unitPrice >= 0)) { setFormError('Prix invalide.'); return }
    try {
      await api(editing ? `/catalog/${editing.id}` : '/catalog', { method: editing ? 'PUT' : 'POST', json: { ...form, unitPrice } })
      toast(editing ? 'Pièce enregistrée' : 'Pièce ajoutée au catalogue')
      if (editing) setOpen(false)
      else { setForm((f) => ({ ...empty, unit: f.unit, supplier: f.supplier })); document.getElementById('c-name')?.focus() } // on enchaîne les saisies
      load()
    } catch (e) { setFormError((e as Error).message) }
  }

  async function remove(i: CatalogItem) {
    if (!window.confirm(`Retirer « ${i.name} » du catalogue ? Le matériel déjà saisi sur les chantiers n’est pas modifié.`)) return
    try { await api(`/catalog/${i.id}`, { method: 'DELETE' }); toast('Pièce retirée'); load() } catch (e) { setError((e as Error).message) }
  }

  return (
    <div>
      <PageHeader title="Catalogue des pièces" subtitle="Vos pièces habituelles et leur prix d’achat. Elles se remplissent toutes seules quand on saisit le matériel d’un chantier."
        actions={<Button icon="plus" onClick={() => openForm(null)}>Ajouter une pièce</Button>} />
      <ErrorBanner message={error} onClose={() => setError('')} />

      {items === null ? <Loading /> : items.length === 0 ? (
        <EmptyState icon="tag" title="Catalogue vide" text="Ajoutez vos références les plus utilisées (câbles, disjoncteurs, prises, gaines…) avec leur prix d’achat." action={<Button icon="plus" onClick={() => openForm(null)}>Ajouter une pièce</Button>} />
      ) : (
        <>
          <div className="mb-4 flex justify-end"><SearchInput value={q} onChange={setQ} placeholder="Nom, référence, fournisseur" /></div>
          <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-lift">
            <table className="tbl">
              <thead><tr><th>Désignation</th><th>Référence</th><th>Unité</th><th className="num">Prix unitaire</th><th>Fournisseur</th><th /></tr></thead>
              <tbody>
                {shown.map((i) => (
                  <tr key={i.id}>
                    <td className="font-medium">{i.name}</td>
                    <td className="text-ink/65">{i.reference}</td>
                    <td>{i.unit}</td>
                    <td className="num font-semibold">{i.unitPrice != null ? money(i.unitPrice) : <span className="text-ink/35">—</span>}</td>
                    <td className="text-ink/65">{i.supplier}</td>
                    <td><div className="flex justify-end"><IconButton icon="edit" label={`Modifier ${i.name}`} onClick={() => openForm(i)} /><IconButton icon="trash" tone="danger" label={`Retirer ${i.name}`} onClick={() => remove(i)} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Modifier la pièce' : 'Ajouter une pièce'}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{editing ? 'Annuler' : 'Terminé'}</Button><Button type="submit" form="cat-form">{editing ? 'Enregistrer' : 'Ajouter'}</Button></>}>
        <form id="cat-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><ErrorBanner message={formError} /></div>
          <Field label="Désignation" htmlFor="c-name" className="sm:col-span-2"><input id="c-name" required maxLength={200} className={inputClass} placeholder="Disjoncteur 16 A Legrand" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Référence" htmlFor="c-ref"><input id="c-ref" maxLength={60} className={inputClass} value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} /></Field>
          <Field label="Unité" htmlFor="c-unit">
            <select id="c-unit" className={inputClass} value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
              {[...new Set([...units, form.unit])].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Prix d’achat unitaire (DA)" htmlFor="c-price"><input id="c-price" inputMode="decimal" className={inputClass} value={form.unitPrice} onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))} /></Field>
          <Field label="Fournisseur" htmlFor="c-sup"><input id="c-sup" maxLength={150} className={inputClass} value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} /></Field>
        </form>
      </Modal>
    </div>
  )
}
