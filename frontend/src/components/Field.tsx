import type { ReactNode } from 'react'

export const inputClass =
  'block w-full rounded-md border border-line bg-white px-3 py-2 text-[15px] text-ink placeholder:text-ink/35 shadow-[inset_0_1px_0_rgba(11,31,51,.03)] transition-colors focus:border-ink focus:outline-none disabled:bg-panel disabled:text-ink/60'

export function Field({ label, htmlFor, hint, children, className }: { label: string; htmlFor: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-ink/85">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink/55">{hint}</p>}
    </div>
  )
}
