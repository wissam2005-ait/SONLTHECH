import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { API_URL } from './http'
import { site } from './site'

/** Coordonnées publiques, saisies par le dirigeant dans « Réglages → Paramètres ». */
export interface PublicCompany {
  name: string
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  logo: string | null
}

const fallback: PublicCompany = { name: site.defaultName, address: null, city: site.city, phone: null, email: null, logo: null }
const Ctx = createContext<PublicCompany>(fallback)

export function PublicCompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<PublicCompany>(fallback)
  useEffect(() => {
    fetch(`${API_URL}/public/company`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c: PublicCompany | null) => c && setCompany({ ...fallback, ...c, name: c.name || fallback.name }))
      .catch(() => { /* le site reste utilisable avec les valeurs par défaut */ })
  }, [])
  return <Ctx.Provider value={company}>{children}</Ctx.Provider>
}

export const usePublicCompany = () => useContext(Ctx)

/** Lien d'appel : garde uniquement les chiffres et le « + ». */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

/** Titre de l'onglet du navigateur pour chaque page. */
export function usePageTitle(title: string) {
  const { name } = usePublicCompany()
  useEffect(() => {
    document.title = title ? `${title} · ${name}` : `${name} — Électricien à ${site.city}`
  }, [title, name])
}
