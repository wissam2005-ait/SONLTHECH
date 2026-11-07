import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Field, inputClass } from '../../components/Field'
import { Icon } from '../../components/icons'
import { Button, EmptyState, ErrorBanner, IconButton, Loading, Modal, PageHeader, SearchInput, useToast } from '../../components/ui'
import { api } from '../../lib/http'
import type { Client, Project } from '../../lib/types'

const empty = { name: '', email: '', phone: '', address: '', postalCode: '', city: '', siret: '', vatNumber: '', notes: '' }

export default function Clients() {
  const toast = useToast()
  const [items, setItems] = useState<Client[] | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [q, setQ] = useState('')
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<Client | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const load = useCallback(() => {
    api<Client[]>(`/clients${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`).then(setItems).catch((e: Error) => setError(e.message))
  }, [q])
  useEffect(load, [load])
  useEffect(() => { api<Project[]>('/projects').then(setProjects).catch(() => undefined) }, [])

  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function openForm(c: Client | null) {
    setEditing(c); setFormError('')
    setForm(c ? { name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '', postalCode: c.postalCode ?? '', city: c.city ?? '', siret: c.siret ?? '', vatNumber: c.vatNumber ?? '', notes: c.notes ?? '' } : empty)
    setOpen(true)
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setFormError('')
    try {
      await api(editing ? `/clients/${editing.id}` : '/clients', { method: editing ? 'PUT' : 'POST', json: form })
      toast(editing ? 'Client enregistré' : 'Client créé')
      setOpen(false)
      load()
    } catch (e) { setFormError((e as Error).message) }
  }

  async function archive(c: Client) {
    if (!window.confirm(`Archiver « ${c.name} » ? Il n’apparaîtra plus dans la liste ; ses chantiers et factures sont conservés.`)) return
    try { await api(`/clients/${c.id}/archive`, { method: 'POST' }); toast('Client archivé'); load() } catch (e) { setError((e as Error).message) }
  }

  const list = items ?? []

  return (
    <div>
      <PageHeader title="Clients" subtitle="Particuliers et professionnels pour qui vous travaillez."
        actions={<><SearchInput value={q} onChange={setQ} placeholder="Nom ou e-mail" /><Button icon="plus" onClick={() => openForm(null)}>Nouveau client</Button></>} />
      <ErrorBanner message={error} onClose={() => setError('')} />

      {items === null ? <Loading /> : list.length === 0 ? (
        <EmptyState icon="clients" title={q ? 'Aucun résultat' : 'Aucun client'} text={q ? undefined : 'Créez un client, ou convertissez une demande reçue depuis le site.'} action={!q && <Button icon="plus" onClick={() => openForm(null)}>Nouveau client</Button>} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const count = projects.filter((p) => p.clientId === c.id).length
            return (
              <li key={c.id} className="flex flex-col rounded-lg border border-line bg-white p-5 shadow-lift">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-xl font-bold leading-tight">{c.name}</p>
                  <div className="-mr-2 -mt-1 flex"><IconButton icon="edit" label={`Modifier ${c.name}`} onClick={() => openForm(c)} /><IconButton icon="trash" tone="danger" label={`Archiver ${c.name}`} onClick={() => archive(c)} /></div>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-ink/70">
                  {c.phone && <li className="flex items-center gap-2"><Icon name="phone" size={15} className="text-ink/40" /><a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a></li>}
                  {c.email && <li className="flex items-center gap-2"><Icon name="mail" size={15} className="text-ink/40" /><a href={`mailto:${c.email}`} className="truncate hover:underline">{c.email}</a></li>}
                  {(c.address || c.city) && <li className="flex items-start gap-2"><Icon name="pin" size={15} className="mt-0.5 shrink-0 text-ink/40" /><span>{[c.address, [c.postalCode, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</span></li>}
                </ul>
                {c.notes && <p className="mt-2 line-clamp-2 text-sm text-ink/55">{c.notes}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <p className="text-xs font-semibold text-ink/50">{count === 0 ? 'Aucun chantier' : `${count} chantier${count > 1 ? 's' : ''}`}</p>
                  <Link to={`/admin/devis?client=${c.id}`} className="text-sm font-semibold text-ink/70 hover:text-ink hover:underline">Faire un devis</Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} wide title={editing ? 'Modifier le client' : 'Nouveau client'}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" form="client-form">{editing ? 'Enregistrer' : 'Créer le client'}</Button></>}>
        <form id="client-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><ErrorBanner message={formError} /></div>
          <Field label="Nom / raison sociale" htmlFor="c-name" className="sm:col-span-2"><input id="c-name" required maxLength={200} className={inputClass} value={form.name} onChange={set('name')} /></Field>
          <Field label="Téléphone" htmlFor="c-phone"><input id="c-phone" type="tel" maxLength={30} className={inputClass} value={form.phone} onChange={set('phone')} /></Field>
          <Field label="E-mail" htmlFor="c-email"><input id="c-email" type="email" maxLength={255} className={inputClass} value={form.email} onChange={set('email')} /></Field>
          <Field label="Adresse" htmlFor="c-address" className="sm:col-span-2"><input id="c-address" maxLength={300} className={inputClass} value={form.address} onChange={set('address')} /></Field>
          <Field label="Code postal" htmlFor="c-zip"><input id="c-zip" maxLength={10} className={inputClass} value={form.postalCode} onChange={set('postalCode')} /></Field>
          <Field label="Ville" htmlFor="c-city"><input id="c-city" maxLength={100} className={inputClass} value={form.city} onChange={set('city')} /></Field>
          <Field label="N° RC (registre du commerce)" htmlFor="c-siret"><input id="c-siret" maxLength={20} className={inputClass} value={form.siret} onChange={set('siret')} /></Field>
          <Field label="NIF" htmlFor="c-vat"><input id="c-vat" maxLength={30} className={inputClass} value={form.vatNumber} onChange={set('vatNumber')} /></Field>
          <Field label="Notes" htmlFor="c-notes" className="sm:col-span-2"><textarea id="c-notes" rows={2} maxLength={2000} className={inputClass} placeholder="Code d’accès, gardien, horaires…" value={form.notes} onChange={set('notes')} /></Field>
        </form>
      </Modal>
    </div>
  )
}
