import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './icons'
import { telHref, usePublicCompany } from '../lib/publicCompany'

/** Motif « circuit » discret pour les fonds sombres */
export function CircuitPattern({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      <defs>
        <pattern id="circuit" width="120" height="120" patternUnits="userSpaceOnUse">
          <path d="M0 60h40l10-10h30l10 10h30M60 0v30l10 10v40l-10 10v30" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="40" cy="60" r="2.5" fill="currentColor" /><circle cx="90" cy="60" r="2.5" fill="currentColor" />
          <circle cx="60" cy="30" r="2.5" fill="currentColor" /><circle cx="60" cy="90" r="2.5" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#circuit)" />
    </svg>
  )
}

/** Bandeau de titre des pages intérieures */
export function PageHero({ kicker, title, text, children }: { kicker: string; title: string; text?: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <CircuitPattern className="text-white/[0.05]" />
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-volt/20 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-volt">{kicker}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">{title}</h1>
        {text && <p className="mt-5 max-w-2xl text-lg text-white/75">{text}</p>}
        {children}
      </div>
    </section>
  )
}

export function SectionTitle({ kicker, title, text, center = false, id }: { kicker: string; title: string; text?: string; center?: boolean; id?: string }) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-wire-amber">{kicker}</p>
      <h2 id={id} className="mt-2 text-4xl font-extrabold leading-tight sm:text-5xl">{title}</h2>
      {text && <p className="mt-4 text-lg text-ink/70">{text}</p>}
    </div>
  )
}

/** Appel à l'action en bas de page */
export function CtaBand() {
  const { phone } = usePublicCompany()
  return (
    <section className="relative overflow-hidden bg-volt">
      <svg aria-hidden="true" viewBox="0 0 200 200" className="absolute -right-10 top-1/2 h-[140%] -translate-y-1/2 text-ink/[0.06]">
        <path d="M118 6 42 116h52l-14 78 76-110h-52z" fill="currentColor" />
      </svg>
      <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-12">
        <div>
          <p className="text-3xl font-extrabold leading-tight sm:text-4xl">Un projet, une panne ?</p>
          <p className="mt-1 text-lg text-ink/75">Décrivez-nous vos besoins : le devis est gratuit et sans engagement.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/devis" className="flex items-center gap-2 rounded-md bg-ink px-6 py-3.5 font-bold text-white transition hover:bg-navy">
            Demander un devis <Icon name="arrow" size={18} />
          </Link>
          {phone && (
            <a href={telHref(phone)} className="flex items-center gap-2 rounded-md border-2 border-ink px-6 py-3 font-bold text-ink transition hover:bg-ink hover:text-white">
              <Icon name="phone" size={18} /> {phone}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
