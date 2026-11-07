import { Link } from 'react-router-dom'
import RealisationsGallery from '../components/RealisationsGallery'

const highlights = [
  { title: 'Installation et rénovation', text: 'Logements, commerces, bureaux : installation complète ou remise à neuf de votre électricité.' },
  { title: 'Mise aux normes', text: 'Mise en conformité, tableaux électriques, mise à la terre et sécurité des personnes.' },
  { title: 'Dépannage', text: 'Panne de courant, disjoncteur qui saute, prise défectueuse : nous intervenons rapidement.' },
]

export default function Home() {
  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">L’électricien de confiance à Alger et ses environs</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">Des chantiers propres, des devis clairs et une équipe qualifiée, du simple dépannage à la rénovation complète.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/devis" className="rounded-md bg-volt px-6 py-3 font-bold text-ink hover:brightness-95">Demander un devis gratuit</Link>
            <Link to="/realisations" className="rounded-md border border-white/40 px-6 py-3 font-semibold hover:border-white">Voir nos réalisations</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="services-title">
        <h2 id="services-title" className="text-3xl font-extrabold">Ce que nous faisons</h2>
        <ul className="mt-6 grid gap-6 md:grid-cols-3">
          {highlights.map((h) => (
            <li key={h.title} className="rounded-lg border border-ink/10 bg-white p-6">
              <h3 className="text-xl font-bold">{h.title}</h3>
              <p className="mt-2 text-ink/75">{h.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6"><Link to="/services" className="font-semibold underline">Tous nos services</Link></p>
      </section>

      {/* Alimenté par les réalisations que l'équipe ajoute depuis son espace */}
      <RealisationsGallery limit={6} />

      <section className="bg-volt">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10">
          <p className="text-2xl font-extrabold">Un projet ? Recevez un devis gratuit.</p>
          <Link to="/devis" className="rounded-md bg-ink px-6 py-3 font-semibold text-white hover:bg-navy">Demander un devis</Link>
        </div>
      </section>
    </>
  )
}
