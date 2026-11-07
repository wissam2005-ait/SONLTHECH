import { useEffect, useState } from 'react'
import { api } from './http'

/** Coordonnées de l'entreprise, modifiables dans Paramètres et imprimées sur les devis et factures. */
export interface Company {
  name: string
  legalForm: string | null
  capital: string | null
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  rc: string | null
  nif: string | null
  nis: string | null
  ai: string | null
  bank: string | null
  footer: string | null
  logo: string | null
}

export const emptyCompany: Company = {
  name: 'Sonlthech', legalForm: null, capital: null, address: null, city: null, phone: null, email: null,
  rc: null, nif: null, nis: null, ai: null, bank: null, footer: null, logo: null,
}

let cache: Company | null = null
let pending: Promise<Company> | null = null
const listeners = new Set<(c: Company) => void>()

function load(): Promise<Company> {
  if (!pending) {
    pending = api<Company>('/settings')
      .then((c) => { cache = c; listeners.forEach((l) => l(c)); return c })
      .catch(() => { pending = null; return cache ?? emptyCompany })
  }
  return pending
}

/** Mise à jour après enregistrement dans Paramètres : tous les écrans ouverts se rafraîchissent. */
export function setCompany(c: Company) {
  cache = c
  pending = Promise.resolve(c)
  listeners.forEach((l) => l(c))
}

export function useCompany(): Company {
  const [c, setC] = useState<Company>(cache ?? emptyCompany)
  useEffect(() => {
    listeners.add(setC)
    if (cache) setC(cache); else load()
    return () => { listeners.delete(setC) }
  }, [])
  return c
}
