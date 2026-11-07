import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from '../lib/http'
import type { PublicRealisation } from '../lib/types'
import { Icon } from './icons'

export const photoUrl = (fileName: string) => `${API_URL}/public/realisations/photos/${fileName}`

interface Props {
  limit?: number
  title?: string | null // null = pas de titre (la page en a déjà un)
  emptyMessage?: string
  showMoreLink?: boolean
}

const when = (r: PublicRealisation) =>
  [r.city, r.completedOn && new Date(r.completedOn).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })].filter(Boolean).join(' · ')

/** Visionneuse plein écran : flèches du clavier, Échap pour fermer */
function Lightbox({ item, start, onClose }: { item: PublicRealisation; start: number; onClose: () => void }) {
  const [i, setI] = useState(start)
  const n = item.photos.length
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [go, onClose])

  return (
    <div role="dialog" aria-modal="true" aria-label={item.title} className="fixed inset-0 z-50 flex flex-col bg-ink/95 p-4 text-white" onClick={onClose}>
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 py-2">
        <div><p className="text-xl font-bold">{item.title}</p><p className="text-sm text-white/60">{when(item)}</p></div>
        <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-2 hover:bg-white/10"><Icon name="x" size={26} /></button>
      </div>
      <div className="relative mx-auto flex w-full max-w-5xl flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img src={photoUrl(item.photos[i])} alt={`${item.title} — photo ${i + 1} sur ${n}`} className="max-h-[75vh] max-w-full rounded-lg object-contain" />
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Photo précédente" className="absolute left-0 rounded-full bg-black/40 p-3 hover:bg-black/60"><Icon name="back" size={24} /></button>
            <button type="button" onClick={() => go(1)} aria-label="Photo suivante" className="absolute right-0 rounded-full bg-black/40 p-3 hover:bg-black/60"><Icon name="next" size={24} /></button>
          </>
        )}
      </div>
      {item.description && <p className="mx-auto max-w-3xl py-3 text-center text-white/75" onClick={(e) => e.stopPropagation()}>{item.description}</p>}
      {n > 1 && <p className="text-center text-sm text-white/50">{i + 1} / {n}</p>}
    </div>
  )
}

/** Réalisations publiées par l'équipe. Page d'accueil : limit={6}. Page Réalisations : sans limite. */
export default function RealisationsGallery({ limit, title = 'Nos dernières réalisations', emptyMessage, showMoreLink = false }: Props) {
  const [items, setItems] = useState<PublicRealisation[] | null>(null)
  const [open, setOpen] = useState<{ item: PublicRealisation; start: number } | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/public/realisations`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PublicRealisation[]) => setItems(data))
      .catch(() => setItems([]))
  }, [])

  if (items === null) {
    return title === null ? <div className="grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((k) => <div key={k} className="aspect-[4/3] animate-pulse rounded-xl bg-panel" />)}</div> : null
  }
  if (items.length === 0) {
    return emptyMessage
      ? <div className="my-10 rounded-xl border border-dashed border-line p-10 text-center text-ink/60"><Icon name="image" size={32} className="mx-auto mb-3 text-ink/30" />{emptyMessage}</div>
      : null
  }
  const shown = limit ? items.slice(0, limit) : items

  return (
    <section aria-labelledby={title ? 'realisations-title' : undefined} className={title ? 'mx-auto max-w-6xl px-4 py-20' : 'py-10'}>
      {title && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-wire-amber">Réalisations</p>
            <h2 id="realisations-title" className="mt-2 text-4xl font-extrabold sm:text-5xl">{title}</h2>
          </div>
          {showMoreLink && <Link to="/realisations" className="flex items-center gap-2 font-semibold hover:text-navy">Toutes nos réalisations <Icon name="arrow" size={18} /></Link>}
        </div>
      )}
      <ul className={`${title ? 'mt-10 ' : ''}grid gap-6 sm:grid-cols-2 lg:grid-cols-3`}>
        {shown.map((r) => (
          <li key={r.id} className="group overflow-hidden rounded-xl border border-line bg-white transition hover:shadow-lift">
            <button type="button" onClick={() => setOpen({ item: r, start: 0 })} className="relative block w-full overflow-hidden" aria-label={`Voir les photos : ${r.title}`}>
              <img src={photoUrl(r.photos[0])} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" />
              {r.photos.length > 1 && (
                <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-white"><Icon name="image" size={14} /> {r.photos.length}</span>
              )}
            </button>
            <div className="p-5">
              <h3 className="text-xl font-bold">{r.title}</h3>
              {when(r) && <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink/55"><Icon name="pin" size={14} /> {when(r)}</p>}
              {r.description && <p className="mt-2 line-clamp-3 text-ink/75">{r.description}</p>}
            </div>
          </li>
        ))}
      </ul>
      {open && <Lightbox item={open.item} start={open.start} onClose={() => setOpen(null)} />}
    </section>
  )
}
