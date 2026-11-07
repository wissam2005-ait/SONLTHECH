import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Field, inputClass } from '../../components/Field'
import { photoUrl } from '../../components/RealisationsGallery'
import { Badge, Button, EmptyState, ErrorBanner, IconButton, Loading, Modal, PageHeader, useToast } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { dateFr } from '../../lib/format'
import { api } from '../../lib/http'
import { photoToBase64 } from '../../lib/image'
import type { Project, Realisation } from '../../lib/types'

const empty = { title: '', city: '', completedOn: '', description: '', projectId: '' }

export default function Realisations() {
  const { session } = useAuth()
  const isAdmin = session?.role === 'ADMIN'
  const toast = useToast()
  const [items, setItems] = useState<Realisation[] | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [form, setForm] = useState(empty)
  const [files, setFiles] = useState<File[]>([])
  const [editing, setEditing] = useState<Realisation | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const load = useCallback(() => { api<Realisation[]>('/realisations').then(setItems).catch((e: Error) => setError(e.message)) }, [])
  useEffect(() => { load(); api<Project[]>('/projects').then(setProjects).catch(() => undefined) }, [load])

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function openNew() { setEditing(null); setForm(empty); setFiles([]); setFormError(''); setOpen(true) }
  function openEdit(r: Realisation) {
    setEditing(r); setFiles([]); setFormError('')
    setForm({ title: r.title, city: r.city ?? '', completedOn: r.completedOn ?? '', description: r.description ?? '', projectId: r.projectId ? String(r.projectId) : '' })
    setOpen(true)
  }

  // Choisir un chantier pré-remplit la ville et le titre si vides
  function onProject(id: string) {
    const p = projects.find((x) => String(x.id) === id)
    setForm((f) => ({ ...f, projectId: id, title: f.title || (p?.name ?? '') }))
  }

  function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    setFiles((prev) => [...prev, ...picked].slice(0, 8))
    e.target.value = ''
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setFormError('')
    const base = { title: form.title, city: form.city, completedOn: form.completedOn || null, description: form.description, projectId: form.projectId ? Number(form.projectId) : null }
    if (!editing && files.length === 0) { setFormError('Ajoutez au moins une photo.'); return }
    setBusy(true)
    try {
      if (editing) {
        await api(`/realisations/${editing.id}`, { method: 'PUT', json: base })
        toast('Réalisation enregistrée')
      } else {
        const photos = await Promise.all(files.map((f) => photoToBase64(f)))
        await api('/realisations', { method: 'POST', json: { ...base, photos } })
        toast('Réalisation publiée sur le site')
      }
      setOpen(false)
      load()
    } catch (e) { setFormError((e as Error).message) } finally { setBusy(false) }
  }

  async function togglePublished(r: Realisation) {
    try {
      await api(`/realisations/${r.id}/published`, { method: 'PATCH', json: { published: !r.published } })
      toast(r.published ? 'Masquée du site' : 'Visible sur le site')
      load()
    } catch (e) { setError((e as Error).message) }
  }

  async function remove(r: Realisation) {
    if (!window.confirm(`Supprimer « ${r.title} » ? Elle disparaîtra du site.`)) return
    try { await api(`/realisations/${r.id}`, { method: 'DELETE' }); toast('Réalisation supprimée'); load() } catch (e) { setError((e as Error).message) }
  }

  const list = items ?? []
  // Un employé ne reçoit que ses propres réalisations : il peut donc toutes les modifier (le serveur vérifie).
  const canEdit = (_r: Realisation) => true

  return (
    <div>
      <PageHeader title={isAdmin ? 'Réalisations' : 'Mes réalisations'} subtitle="Les chantiers terminés présentés aux clients sur la page d’accueil du site."
        actions={<Button icon="plus" onClick={openNew}>Ajouter une réalisation</Button>} />
      <ErrorBanner message={error} onClose={() => setError('')} />

      {items === null ? <Loading /> : list.length === 0 ? (
        <EmptyState icon="image" title="Aucune réalisation" text="Prenez quelques photos d’un chantier terminé : elles donnent confiance aux futurs clients." action={<Button icon="plus" onClick={openNew}>Ajouter une réalisation</Button>} />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => (
            <li key={r.id} className="flex flex-col overflow-hidden rounded-lg border border-line bg-white shadow-lift">
              <div className="relative">
                {r.photos[0] ? <img src={photoUrl(r.photos[0])} alt={r.title} loading="lazy" className={`aspect-[4/3] w-full object-cover ${r.published ? '' : 'opacity-50 grayscale'}`} /> : <div className="aspect-[4/3] bg-panel" />}
                <span className="absolute left-3 top-3">{r.published ? <Badge tone="volt">Sur le site</Badge> : <Badge>Masquée</Badge>}</span>
                {r.photos.length > 1 && <span className="absolute bottom-3 right-3 rounded bg-ink/75 px-2 py-0.5 text-xs font-semibold text-white">{r.photos.length} photos</span>}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="font-display text-xl font-bold leading-tight">{r.title}</p>
                <p className="mt-0.5 text-sm text-ink/55">{[r.city, r.completedOn && dateFr(r.completedOn), isAdmin && r.authorName && `par ${r.authorName}`].filter(Boolean).join(', ')}</p>
                {r.projectId && <p className="mt-1 text-xs text-ink/50">Chantier : {projects.find((p) => p.id === r.projectId)?.name ?? `n°${r.projectId}`}</p>}
                {r.description && <p className="mt-2 line-clamp-3 text-sm text-ink/75">{r.description}</p>}
                <div className="mt-auto flex items-center justify-end gap-1 pt-3">
                  {isAdmin && <IconButton icon={r.published ? 'eyeOff' : 'eye'} label={r.published ? 'Masquer du site' : 'Afficher sur le site'} onClick={() => togglePublished(r)} />}
                  {canEdit(r) && <IconButton icon="edit" label="Modifier" onClick={() => openEdit(r)} />}
                  {canEdit(r) && <IconButton icon="trash" tone="danger" label="Supprimer" onClick={() => remove(r)} />}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} wide title={editing ? 'Modifier la réalisation' : 'Nouvelle réalisation'}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" form="real-form" disabled={busy}>{busy ? 'Envoi des photos…' : editing ? 'Enregistrer' : 'Publier sur le site'}</Button></>}>
        <form id="real-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><ErrorBanner message={formError} /></div>
          <Field label="Chantier concerné (facultatif)" htmlFor="r-project" className="sm:col-span-2">
            <select id="r-project" className={inputClass} value={form.projectId} onChange={(e) => onProject(e.target.value)}>
              <option value="">Aucun</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Titre" htmlFor="r-title" className="sm:col-span-2"><input id="r-title" required maxLength={150} className={inputClass} placeholder="Rénovation électrique d’un appartement haussmannien" value={form.title} onChange={set('title')} /></Field>
          <Field label="Ville" htmlFor="r-city"><input id="r-city" maxLength={100} className={inputClass} value={form.city} onChange={set('city')} /></Field>
          <Field label="Fin des travaux" htmlFor="r-date"><input id="r-date" type="date" className={inputClass} value={form.completedOn} onChange={set('completedOn')} /></Field>
          <Field label="Description" htmlFor="r-desc" className="sm:col-span-2"><textarea id="r-desc" rows={3} maxLength={3000} className={inputClass} value={form.description} onChange={set('description')} /></Field>
          {editing ? (
            <p className="text-sm text-ink/55 sm:col-span-2">Les photos ne se modifient pas : pour en changer, supprimez la réalisation et recréez-la.</p>
          ) : (
            <div className="sm:col-span-2">
              <Field label="Photos (1 à 8)" htmlFor="r-photos" hint="La première sert d’image principale. Elles sont réduites automatiquement avant l’envoi.">
                <input id="r-photos" type="file" accept="image/*" multiple onChange={onFiles} className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-4 file:py-2 file:font-semibold file:text-white" />
              </Field>
              {previews.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-3">
                  {previews.map((src, i) => (
                    <li key={src} className="relative">
                      <img src={src} alt={`Photo ${i + 1}`} className={`h-20 w-28 rounded object-cover ${i === 0 ? 'ring-2 ring-volt' : ''}`} />
                      <button type="button" aria-label={`Retirer la photo ${i + 1}`} onClick={() => setFiles((f) => f.filter((_, j) => j !== i))} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-white">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}
