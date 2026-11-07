import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Field, inputClass } from '../../components/Field'
import { Button, ErrorBanner, Loading, PageHeader, Section, useToast } from '../../components/ui'
import { setCompany, type Company } from '../../lib/company'
import { api } from '../../lib/http'

/** Réduit le logo (PNG conservé pour la transparence) à 400 px de large au maximum. */
async function logoToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choisissez une image (PNG ou JPEG).')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 400 / bitmap.width, 200 / bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const url = canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9)
  if (url.length > 540_000) throw new Error('Logo trop lourd : utilisez une image plus simple.')
  return url
}

const fields: { key: keyof Company; label: string; placeholder?: string; wide?: boolean }[] = [
  { key: 'name', label: 'Nom de l’entreprise' },
  { key: 'legalForm', label: 'Forme juridique', placeholder: 'EURL, SARL, personne physique…' },
  { key: 'capital', label: 'Capital social', placeholder: '100 000 DA' },
  { key: 'phone', label: 'Téléphone', placeholder: '0550 00 00 00' },
  { key: 'email', label: 'E-mail' },
  { key: 'city', label: 'Ville', placeholder: 'Alger' },
  { key: 'address', label: 'Adresse', wide: true },
  { key: 'rc', label: 'N° du registre du commerce (RC)' },
  { key: 'nif', label: 'NIF' },
  { key: 'nis', label: 'NIS' },
  { key: 'ai', label: 'Article d’imposition (AI)' },
  { key: 'bank', label: 'Coordonnées de paiement', placeholder: 'RIB ou n° de compte CCP', wide: true },
]

export default function Settings() {
  const toast = useToast()
  const [form, setForm] = useState<Company | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { api<Company>('/settings').then(setForm).catch((e: Error) => setError(e.message)) }, [])

  async function onLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !form) return
    try { setForm({ ...form, logo: await logoToDataUrl(file) }) } catch (err) { setError((err as Error).message) }
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!form) return
    setError('')
    setBusy(true)
    try {
      const saved = await api<Company>('/settings', { method: 'PUT', json: form })
      setCompany(saved)
      setForm(saved)
      toast('Paramètres enregistrés')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  if (!form) return error ? <ErrorBanner message={error} /> : <Loading />
  const set = (k: keyof Company) => (e: { target: { value: string } }) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f))

  return (
    <form onSubmit={onSubmit}>
      <PageHeader title="Paramètres" subtitle="Les informations de l’entreprise imprimées sur chaque devis et chaque facture."
        actions={<Button type="submit" icon="check" disabled={busy}>Enregistrer</Button>} />
      <ErrorBanner message={error} onClose={() => setError('')} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="Entreprise" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <Field key={f.key} label={f.label} htmlFor={`s-${f.key}`} className={f.wide ? 'sm:col-span-2' : ''}>
                <input id={`s-${f.key}`} required={f.key === 'name'} className={inputClass} placeholder={f.placeholder} value={(form[f.key] as string | null) ?? ''} onChange={set(f.key)} />
              </Field>
            ))}
            <Field label="Mentions en bas des documents (facultatif)" htmlFor="s-footer" className="sm:col-span-2">
              <textarea id="s-footer" rows={2} maxLength={1000} className={inputClass} placeholder="Conditions de paiement, garantie…" value={form.footer ?? ''} onChange={set('footer')} />
            </Field>
          </div>
        </Section>

        <div className="space-y-5">
          <Section title="Logo">
            <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-ink/20 bg-panel/50">
              {form.logo ? <img src={form.logo} alt="Logo de l’entreprise" className="max-h-24 max-w-full object-contain" /> : <span className="text-sm text-ink/45">Aucun logo</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-line bg-white px-2.5 text-sm font-semibold hover:border-ink/40">
                Choisir une image<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onLogo} />
              </label>
              {form.logo && <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, logo: null })}>Retirer</Button>}
            </div>
            <p className="mt-2 text-xs text-ink/55">PNG de préférence (fond transparent). Il apparaît en haut à gauche des devis et factures.</p>
          </Section>

          <Section title="Aperçu de l’en-tête">
            <div className="flex items-start gap-3 text-xs leading-snug">
              {form.logo && <img src={form.logo} alt="" className="h-12 w-auto max-w-[6rem] object-contain" />}
              <div>
                <p className="font-display text-lg font-bold">{form.name || 'Nom de l’entreprise'}</p>
                {(form.legalForm || form.capital) && <p>{[form.legalForm, form.capital && `au capital de ${form.capital}`].filter(Boolean).join(' ')}</p>}
                {(form.address || form.city) && <p>{[form.address, form.city].filter(Boolean).join(', ')}</p>}
                {(form.phone || form.email) && <p>{[form.phone && `Tél. ${form.phone}`, form.email].filter(Boolean).join(' – ')}</p>}
                {(form.rc || form.nif) && <p>{[form.rc && `RC : ${form.rc}`, form.nif && `NIF : ${form.nif}`].filter(Boolean).join(' – ')}</p>}
                {(form.nis || form.ai) && <p>{[form.nis && `NIS : ${form.nis}`, form.ai && `AI : ${form.ai}`].filter(Boolean).join(' – ')}</p>}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </form>
  )
}
