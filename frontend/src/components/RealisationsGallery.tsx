import { useEffect, useState } from 'react'
import { API_URL } from '../lib/http'
import type { PublicRealisation } from '../lib/types'

export const photoUrl = (fileName: string) => `${API_URL}/public/realisations/photos/${fileName}`

interface Props {
  limit?: number
  title?: string | null // null = pas de titre (la page en a déjà un)
  emptyMessage?: string
}

/** Réalisations publiées par l'équipe. Page d'accueil : limit={6}. Page Réalisations : sans limite. */
export default function RealisationsGallery({ limit, title = 'Nos dernières réalisations', emptyMessage }: Props) {
  const [items, setItems] = useState<PublicRealisation[] | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/public/realisations`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PublicRealisation[]) => setItems(data))
      .catch(() => setItems([]))
  }, [])

  if (items === null) return null
  if (items.length === 0) return emptyMessage ? <p className="py-8 text-ink/60">{emptyMessage}</p> : null
  const shown = limit ? items.slice(0, limit) : items

  return (
    <section aria-labelledby={title ? 'realisations-title' : undefined} className="mx-auto max-w-6xl px-4 py-12">
      {title && <h2 id="realisations-title" className="text-3xl font-extrabold">{title}</h2>}
      <ul className={`${title ? 'mt-6 ' : ''}grid gap-6 sm:grid-cols-2 lg:grid-cols-3`}>
        {shown.map((r) => (
          <li key={r.id} className="overflow-hidden rounded-lg border border-ink/10 bg-white">
            <img src={photoUrl(r.photos[0])} alt={`Réalisation : ${r.title}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            <div className="p-4">
              <h3 className="text-lg font-semibold">{r.title}</h3>
              <p className="text-sm text-ink/60">
                {[r.city, r.completedOn && new Date(r.completedOn).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })].filter(Boolean).join(' · ')}
              </p>
              {r.description && <p className="mt-2 line-clamp-3 text-ink/80">{r.description}</p>}
              {r.photos.length > 1 && (
                <ul className="mt-3 flex gap-2 overflow-x-auto">
                  {r.photos.slice(1).map((p) => (
                    <li key={p}><img src={photoUrl(p)} alt="" loading="lazy" className="h-14 w-20 rounded object-cover" /></li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
