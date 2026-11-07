import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Icon } from './icons'
import { PublicCompanyProvider, telHref, usePublicCompany } from '../lib/publicCompany'
import { site } from '../lib/site'

const nav = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/services', label: 'Services' },
  { to: '/realisations', label: 'Réalisations' },
  { to: '/contact', label: 'Contact' },
]

function Logo({ light = true }: { light?: boolean }) {
  const { name, logo } = usePublicCompany()
  return (
    <Link to="/" className={`flex items-center gap-2.5 font-display text-[1.7rem] font-bold leading-none ${light ? 'text-white' : 'text-ink'}`}>
      {logo
        ? <img src={logo} alt="" className="h-10 w-10 rounded-md bg-white object-contain p-0.5" />
        : <span className="flex h-10 w-10 items-center justify-center rounded-md bg-volt text-ink shadow-[0_0_24px_-4px_rgba(245,211,0,.7)]"><Icon name="bolt" size={22} strokeWidth={2.2} /></span>}
      {name}
    </Link>
  )
}

function Header() {
  const { phone, email } = usePublicCompany()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])

  return (
    <header className="sticky top-0 z-40">
      {(phone || email) && (
        <div className="hidden bg-[#071624] text-[13px] text-white/70 md:block">
          <div className="mx-auto flex max-w-6xl items-center justify-end gap-6 px-4 py-1.5">
            <span className="mr-auto flex items-center gap-1.5"><Icon name="pin" size={14} /> {site.area}</span>
            {phone && <a href={telHref(phone)} className="flex items-center gap-1.5 hover:text-volt"><Icon name="phone" size={14} /> {phone}</a>}
            {email && <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-volt"><Icon name="mail" size={14} /> {email}</a>}
          </div>
        </div>
      )}
      <div className="border-b border-white/10 bg-ink/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5">
          <Logo />
          <nav aria-label="Navigation principale" className="hidden items-center gap-1 text-[15px] font-medium md:flex">
            {nav.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end}
                className={({ isActive }) => `relative rounded px-3 py-2 transition-colors ${isActive ? 'text-volt' : 'text-white/80 hover:text-white'}`}>
                {i.label}
              </NavLink>
            ))}
            <Link to="/devis" className="ml-3 flex items-center gap-2 rounded-md bg-volt px-4 py-2.5 font-bold text-ink transition hover:brightness-95">
              Devis gratuit <Icon name="arrow" size={16} strokeWidth={2.2} />
            </Link>
          </nav>
          <button type="button" className="rounded-md p-2 text-white md:hidden" aria-expanded={open} aria-controls="menu-mobile"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? 'x' : 'menu'} size={26} />
          </button>
        </div>
        {open && (
          <nav id="menu-mobile" aria-label="Navigation mobile" className="border-t border-white/10 px-4 pb-5 pt-2 md:hidden">
            {nav.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end}
                className={({ isActive }) => `block border-b border-white/5 py-3 text-lg ${isActive ? 'text-volt' : 'text-white/90'}`}>
                {i.label}
              </NavLink>
            ))}
            <Link to="/devis" className="mt-4 flex items-center justify-center gap-2 rounded-md bg-volt px-4 py-3 font-bold text-ink">Demander un devis gratuit</Link>
            {phone && <a href={telHref(phone)} className="mt-2 flex items-center justify-center gap-2 rounded-md border border-white/25 px-4 py-3 font-semibold"><Icon name="phone" size={18} /> {phone}</a>}
          </nav>
        )}
      </div>
    </header>
  )
}

function Footer() {
  const { name, phone, email, address, city } = usePublicCompany()
  return (
    <footer className="bg-ink text-white/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed">Électricité générale : installation, rénovation, mise en conformité et dépannage. {site.area}.</p>
        </div>
        <div>
          <p className="font-display text-lg font-bold uppercase tracking-wide text-white">Services</p>
          <ul className="mt-4 space-y-2 text-sm">
            {site.services.slice(0, 6).map((s) => (
              <li key={s.slug}><Link to={`/services#${s.slug}`} className="hover:text-volt">{s.title}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-display text-lg font-bold uppercase tracking-wide text-white">Le site</p>
          <ul className="mt-4 space-y-2 text-sm">
            {nav.map((n) => <li key={n.to}><Link to={n.to} className="hover:text-volt">{n.label}</Link></li>)}
            <li><Link to="/devis" className="hover:text-volt">Demande de devis</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-display text-lg font-bold uppercase tracking-wide text-white">Contact</p>
          <ul className="mt-4 space-y-3 text-sm">
            {phone && <li><a href={telHref(phone)} className="flex items-start gap-2 hover:text-volt"><Icon name="phone" size={16} className="mt-0.5 shrink-0 text-volt" />{phone}</a></li>}
            {email && <li><a href={`mailto:${email}`} className="flex items-start gap-2 break-all hover:text-volt"><Icon name="mail" size={16} className="mt-0.5 shrink-0 text-volt" />{email}</a></li>}
            <li className="flex items-start gap-2"><Icon name="pin" size={16} className="mt-0.5 shrink-0 text-volt" />{[address, city].filter(Boolean).join(', ') || site.area}</li>
            <li><Link to="/contact" className="font-semibold text-white underline-offset-4 hover:underline">Nous écrire</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs">
          <p>© {new Date().getFullYear()} {name} — Électricité générale, {site.area}</p>
          <Link to="/admin/login" className="flex items-center gap-1.5 hover:text-white"><Icon name="key" size={14} /> Espace professionnel</Link>
        </div>
      </div>
    </footer>
  )
}

/** Bouton d'appel flottant sur mobile, si un téléphone est renseigné */
function MobileCall() {
  const { phone } = usePublicCompany()
  if (!phone) return null
  return (
    <a href={telHref(phone)} aria-label={`Appeler le ${phone}`}
      className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-volt text-ink shadow-lg shadow-ink/30 md:hidden">
      <Icon name="phone" size={24} strokeWidth={2} />
    </a>
  )
}

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function Layout() {
  return (
    <PublicCompanyProvider>
      <div className="flex min-h-screen flex-col bg-white">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:p-2">Aller au contenu</a>
        <ScrollToTop />
        <Header />
        <main id="contenu" className="flex-1"><Outlet /></main>
        <Footer />
        <MobileCall />
      </div>
    </PublicCompanyProvider>
  )
}
