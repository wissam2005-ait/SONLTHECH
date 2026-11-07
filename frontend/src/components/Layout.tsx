import { Link, NavLink, Outlet } from 'react-router-dom'
import { Icon } from './icons'

const nav = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/services', label: 'Services' },
  { to: '/realisations', label: 'Réalisations' },
  { to: '/contact', label: 'Contact' },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-white focus:p-2">Aller au contenu</a>
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link to="/" className="flex items-center gap-2.5 font-display text-3xl font-bold"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-volt text-ink"><Icon name="bolt" size={20} strokeWidth={2.2} /></span>ElectroPro</Link>
          <nav aria-label="Navigation principale" className="flex flex-wrap items-center gap-1 text-sm font-medium">
            {nav.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `rounded px-3 py-2 ${isActive ? 'bg-white/10 text-volt' : 'text-white/85 hover:text-white'}`}>{i.label}</NavLink>
            ))}
            <Link to="/devis" className="ml-2 rounded-md bg-volt px-4 py-2 font-bold text-ink hover:brightness-95">Devis gratuit</Link>
          </nav>
        </div>
      </header>
      <main id="contenu" className="flex-1"><Outlet /></main>
      <footer className="bg-ink text-sm text-white/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6">
          <p>© {new Date().getFullYear()} ElectroPro — Électricité générale, Alger et environs</p>
          <Link to="/admin/login" className="underline hover:text-white">Espace professionnel</Link>
        </div>
      </footer>
    </div>
  )
}
