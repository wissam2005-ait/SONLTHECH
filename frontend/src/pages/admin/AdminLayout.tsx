import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon, type IconName } from '../../components/icons'
import { useAuth } from '../../lib/auth'
import { usePublicCompany } from '../../lib/publicCompany'
import { roleLabels, type Role } from '../../lib/types'

interface Item { to: string; label: string; icon: IconName; roles: Role[]; end?: boolean }
const ALL: Role[] = ['ADMIN', 'EMPLOYEE', 'INTERN']
const ADMIN: Role[] = ['ADMIN']

/** Chaque groupe est une « rangée » du tableau ; chaque page, un disjoncteur. */
const groups: { label: string; items: Item[] }[] = [
  { label: 'Pilotage', items: [
    { to: '/admin', label: 'Tableau de bord', icon: 'dashboard', roles: ADMIN, end: true },
    { to: '/admin/demandes', label: 'Demandes', icon: 'inbox', roles: ADMIN },
    { to: '/admin/clients', label: 'Clients', icon: 'clients', roles: ADMIN },
  ] },
  { label: 'Chantiers', items: [
    { to: '/admin/chantiers', label: 'Chantiers', icon: 'site', roles: ALL },
    { to: '/admin/taches', label: 'Tâches', icon: 'tasks', roles: ALL },
    { to: '/admin/materiel', label: 'Matériel', icon: 'box', roles: ALL },
    { to: '/admin/catalogue', label: 'Catalogue des pièces', icon: 'tag', roles: ADMIN },
  ] },
  { label: 'Équipe', items: [
    { to: '/admin/employes', label: 'Employés', icon: 'users', roles: ADMIN },
    { to: '/admin/absences', label: 'Absences', icon: 'calendar', roles: ADMIN },
    { to: '/admin/salaires', label: 'Salaires', icon: 'wallet', roles: ADMIN },
  ] },
  { label: 'Facturation', items: [
    { to: '/admin/devis', label: 'Devis', icon: 'edit', roles: ADMIN },
    { to: '/admin/factures', label: 'Factures', icon: 'invoice', roles: ADMIN },
  ] },
  { label: 'Site vitrine', items: [
    { to: '/admin/realisations', label: 'Réalisations', icon: 'image', roles: ALL },
  ] },
  { label: 'Réglages', items: [
    { to: '/admin/parametres', label: 'Paramètres', icon: 'settings', roles: ADMIN },
    { to: '/admin/compte', label: 'Mon compte', icon: 'key', roles: ALL },
  ] },
]

function Breaker({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={`relative flex h-[22px] w-[13px] shrink-0 items-start justify-center rounded-[3px] border ${on ? 'border-volt/70 bg-volt/10' : 'border-white/20 bg-white/[.03]'}`}>
      <span className={`absolute left-[2px] right-[2px] h-[8px] rounded-[2px] transition-all duration-200 ${on ? 'top-[2px] bg-volt shadow-[0_0_8px_rgba(245,211,0,.6)]' : 'top-[10px] bg-white/35'}`} />
    </span>
  )
}

export default function AdminLayout() {
  const { session, logout } = useAuth()
  const { name: companyName } = usePublicCompany()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [location.pathname])

  const role = session?.role
  const visible = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => role && i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0)

  const nav = (
    <nav aria-label="Espace professionnel" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
      {visible.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 flex items-center gap-2 px-2 text-xs font-medium text-white/40">
            {g.label}<span className="h-px flex-1 bg-white/10" />
          </p>
          <ul className="space-y-0.5">
            {g.items.map((i) => (
              <li key={i.to}>
                <NavLink to={i.to} end={i.end}
                  className={({ isActive }) => `group flex items-center gap-3 rounded-md px-2 py-2 text-[15px] font-medium transition-colors ${isActive ? 'bg-white/[.07] text-white' : 'text-white/70 hover:bg-white/[.04] hover:text-white'}`}>
                  {({ isActive }) => (
                    <>
                      <Breaker on={isActive} />
                      <Icon name={i.icon} size={17} className={isActive ? 'text-volt' : 'text-white/45 group-hover:text-white/70'} />
                      <span className="truncate">{i.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )

  const brand = (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-volt text-ink"><Icon name="bolt" size={20} strokeWidth={2.2} /></span>
      <p className="font-display text-2xl font-bold leading-none text-white">{companyName}</p>
    </div>
  )

  const footer = (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-3 rounded-md px-2 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{session?.fullName}</p>
          <p className="text-xs text-white/45">{role && roleLabels[role]}</p>
        </div>
        <button type="button" onClick={() => { logout(); navigate('/admin/login') }} aria-label="Se déconnecter" title="Se déconnecter"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white">
          <Icon name="logout" size={18} />
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:flex">
      {/* Barre latérale (ordinateur) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-ink lg:flex print:hidden">
        <div className="px-5 pb-6 pt-5">{brand}</div>
        {nav}
        {footer}
      </aside>

      {/* Barre du haut + tiroir (téléphone, tablette) */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden print:hidden">
        {brand}
        <button type="button" onClick={() => setOpen(true)} aria-label="Ouvrir le menu" className="flex h-10 w-10 items-center justify-center rounded-md text-white hover:bg-white/10">
          <Icon name="menu" size={22} />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-ink">
            <div className="flex items-center justify-between px-5 pb-6 pt-5">
              {brand}
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer le menu" className="flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/10"><Icon name="x" size={20} /></button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9 print:p-0">
        <div className="mx-auto max-w-7xl"><Outlet /></div>
      </main>
    </div>
  )
}
