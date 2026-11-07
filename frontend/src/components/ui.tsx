import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from './icons'

/* ---------- Boutons ---------- */

type Variant = 'primary' | 'volt' | 'secondary' | 'ghost' | 'danger'
const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-navy',
  volt: 'bg-volt text-ink hover:brightness-95',
  secondary: 'border border-line bg-white text-ink hover:border-ink/40',
  ghost: 'text-ink/75 hover:bg-ink/5 hover:text-ink',
  danger: 'border border-wire-red/30 bg-white text-wire-red hover:bg-wire-red hover:text-white',
}

export function Button({ variant = 'primary', icon, size = 'md', className = '', children, ...rest }:
  { variant?: Variant; icon?: IconName; size?: 'sm' | 'md' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const sz = size === 'sm' ? 'h-8 gap-1.5 px-2.5 text-sm' : 'h-10 gap-2 px-4 text-[15px]'
  return (
    <button type="button" className={`inline-flex shrink-0 items-center justify-center rounded-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${sz} ${variants[variant]} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
    </button>
  )
}

/** Petit bouton icône (actions de ligne dans les tableaux). */
export function IconButton({ icon, label, tone = 'default', ...rest }: { icon: IconName; label: string; tone?: 'default' | 'danger' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-label={label} title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${tone === 'danger' ? 'text-ink/50 hover:bg-wire-red/10 hover:text-wire-red' : 'text-ink/55 hover:bg-ink/5 hover:text-ink'}`} {...rest}>
      <Icon name={icon} size={16} />
    </button>
  )
}

/* ---------- Mise en page ---------- */

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <header className="mb-6">
      {back && (
        <Link to={back.to} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-ink/60 hover:text-ink">
          <Icon name="back" size={16} />{back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[2rem] font-bold leading-tight sm:text-[2.4rem]">{title}</h1>
          {subtitle && <div className="mt-1 text-ink/60">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}

export function Card({ children, className = '', pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <div className={`rounded-lg border border-line bg-white shadow-lift ${pad ? 'p-5' : ''} ${className}`}>{children}</div>
}

/** Section avec titre, pour les fiches (chantier, employé). */
export function Section({ title, actions, children, className = '' }: { title: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-white shadow-lift ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

/* ---------- Données ---------- */

export type Tone = 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'brown' | 'volt'
const tones: Record<Tone, string> = {
  neutral: 'bg-ink/[.07] text-ink/75',
  blue: 'bg-wire-blue/10 text-wire-blue',
  green: 'bg-wire-green/10 text-wire-green',
  amber: 'bg-wire-amber/10 text-wire-amber',
  red: 'bg-wire-red/10 text-wire-red',
  brown: 'bg-wire-brown/10 text-wire-brown',
  volt: 'bg-volt text-ink',
}

export function Badge({ tone = 'neutral', children, dot = false }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Chiffre clé. `to` rend la carte cliquable. */
export function Stat({ label, value, hint, tone, to }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'red' | 'green' | 'amber'; to?: string }) {
  const color = tone === 'red' ? 'text-wire-red' : tone === 'green' ? 'text-wire-green' : tone === 'amber' ? 'text-wire-amber' : 'text-ink'
  const body = (
    <>
      <p className="text-sm font-medium text-ink/60">{label}</p>
      <p className={`mt-1 font-display text-[1.6rem] font-bold leading-none tabular-nums [overflow-wrap:anywhere] xl:text-[2rem] ${color}`}>{value}</p>
      {hint && <p className="mt-2 text-xs text-ink/55">{hint}</p>}
    </>
  )
  const cls = 'block rounded-lg border border-line bg-white p-4 shadow-lift'
  return to ? <Link to={to} className={`${cls} transition-colors hover:border-ink/40`}>{body}</Link> : <div className={cls}>{body}</div>
}

/**
 * Jauge d'avancement : graduations à 25/50/75 % comme sur un cadran de mesure.
 * Jaune « sous tension » pendant le chantier, vert à 100 %.
 */
export function Progress({ value, size = 'md', showLabel = true }: { value: number; size?: 'sm' | 'md'; showLabel?: boolean }) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  const h = size === 'sm' ? 'h-2' : 'h-3'
  return (
    <div className="flex items-center gap-3">
      <div className={`relative ${h} flex-1 overflow-hidden rounded-sm bg-ink/[.08]`} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement">
        <div className={`h-full ${v === 100 ? 'bg-wire-green' : 'bg-volt'} transition-[width] duration-500`} style={{ width: `${v}%` }} />
        {[25, 50, 75].map((t) => <span key={t} className="absolute inset-y-0 w-px bg-white/80" style={{ left: `${t}%` }} />)}
      </div>
      {showLabel && <span className="w-11 text-right font-display text-lg font-bold tabular-nums">{v}%</span>}
    </div>
  )
}

export function EmptyState({ icon = 'bolt', title, text, action }: { icon?: IconName; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-ink/20 bg-white/60 px-6 py-12 text-center">
      <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-volt/40 text-ink"><Icon name={icon} size={20} /></span>
      <p className="font-display text-xl font-bold">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-md text-sm text-ink/60">{text}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function ErrorBanner({ message, onClose }: { message: string; onClose?: () => void }) {
  if (!message) return null
  return (
    <div role="alert" className="mb-4 flex items-start gap-3 rounded-md border border-wire-red/30 bg-wire-red/5 px-4 py-3 text-sm text-wire-red">
      <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1">{message}</p>
      {onClose && <button type="button" onClick={onClose} aria-label="Fermer le message" className="text-wire-red/70 hover:text-wire-red"><Icon name="x" size={16} /></button>}
    </div>
  )
}

export function Loading() {
  return <p className="py-10 text-center text-ink/50">Chargement…</p>
}

export function Avatar({ name, muted = false }: { name: string; muted?: boolean }) {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${muted ? 'bg-ink/10 text-ink/50' : 'bg-ink text-volt'}`} aria-hidden="true">
      {letters || '?'}
    </span>
  )
}

/* ---------- Onglets ---------- */

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`-mb-px whitespace-nowrap border-b-[3px] px-3 pb-2.5 pt-1 text-[15px] font-semibold transition-colors ${value === t.id ? 'border-volt text-ink' : 'border-transparent text-ink/55 hover:text-ink'}`}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 rounded bg-ink/[.07] px-1.5 text-xs tabular-nums">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* ---------- Fenêtre modale ---------- */

export function Modal({ open, title, onClose, children, footer, wide = false, xl = false }:
  { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; xl?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // focus sur le premier champ
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input:not([type=hidden]),select,textarea,button[data-autofocus]')?.focus(), 0)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [open])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="modal-title"
        className={`flex max-h-[92vh] w-full flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl ${xl ? 'sm:max-w-6xl' : wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="modal-title" className="text-xl font-bold">{title}</h2>
          <IconButton icon="x" label="Fermer" onClick={onClose} />
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-panel/50 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/* ---------- Notifications ---------- */

interface ToastItem { id: number; text: string; tone: 'ok' | 'error' }
const ToastContext = createContext<(text: string, tone?: 'ok' | 'error') => void>(() => undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random()
    setItems((l) => [...l, { id, text, tone }])
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 3500)
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-2 rounded-md px-4 py-3 text-sm font-semibold shadow-lg ${t.tone === 'ok' ? 'bg-ink text-white' : 'bg-wire-red text-white'}`}>
            <Icon name={t.tone === 'ok' ? 'check' : 'alert'} size={16} className={t.tone === 'ok' ? 'text-volt' : ''} />{t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

/* ---------- Divers ---------- */

export function SearchInput({ value, onChange, placeholder = 'Rechercher…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="relative block">
      <span className="sr-only">{placeholder}</span>
      <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-3 text-[15px] placeholder:text-ink/40 focus:border-ink focus:outline-none sm:w-64" />
    </label>
  )
}

/** Liste de filtres en pastilles (statuts). */
export function FilterPills<T extends string>({ options, value, onChange }: { options: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer">
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}
          className={`h-8 rounded-full border px-3 text-sm font-semibold transition-colors ${value === o.id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink/70 hover:border-ink/40'}`}>
          {o.label}{o.count !== undefined && <span className={`ml-1.5 tabular-nums ${value === o.id ? 'text-volt' : 'text-ink/45'}`}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

/** Petite ligne d'information « étiquette : valeur » pour les fiches. */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/70 py-2 text-sm last:border-0">
      <dt className="text-ink/55">{label}</dt>
      <dd className="text-right font-medium">{children || <span className="text-ink/35">—</span>}</dd>
    </div>
  )
}
