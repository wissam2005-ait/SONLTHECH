import { Link } from 'react-router-dom'
import { Icon } from '../components/icons'
import { CtaBand, PageHero } from '../components/site'
import { site } from '../lib/site'
import { usePageTitle } from '../lib/publicCompany'

export default function Services() {
  usePageTitle('Nos services')
  return (
    <>
      <PageHero kicker="Nos services" title="Électricité générale, du dépannage au chantier complet"
        text={`Particuliers, commerces et entreprises : nous intervenons à ${site.area} pour tous vos travaux électriques.`}>
        <nav aria-label="Accès rapide aux services" className="mt-8 flex flex-wrap gap-2">
          {site.services.map((s) => (
            <a key={s.slug} href={`#${s.slug}`} className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-sm text-white/80 transition hover:border-volt hover:text-volt">
              <Icon name={s.icon} size={14} /> {s.title}
            </a>
          ))}
        </nav>
      </PageHero>

      <div className="mx-auto max-w-6xl px-4 py-16">
        <ul className="grid gap-6 md:grid-cols-2">
          {site.services.map((s, i) => (
            <li key={s.slug} id={s.slug} className="scroll-mt-28 rounded-xl border border-line bg-white p-7 transition hover:shadow-lift">
              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-ink text-volt"><Icon name={s.icon} size={26} /></span>
                <div>
                  <p className="font-display text-sm font-bold text-ink/40">{String(i + 1).padStart(2, '0')}</p>
                  <h2 className="text-3xl font-bold leading-tight">{s.title}</h2>
                </div>
              </div>
              <p className="mt-4 text-ink/75">{s.text}</p>
              <ul className="mt-5 space-y-2">
                {s.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[15px]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-volt/30"><Icon name="check" size={13} strokeWidth={2.6} /></span>{p}
                  </li>
                ))}
              </ul>
              <Link to={`/devis?travaux=${encodeURIComponent(s.title)}`} className="mt-6 inline-flex items-center gap-1.5 font-semibold text-wire-blue hover:underline">
                Demander un devis <Icon name="arrow" size={16} />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <section className="bg-panel py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-3">
          {site.audiences.map((a) => (
            <div key={a.title} className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-lift"><Icon name={a.icon} size={22} /></span>
              <div><h2 className="text-2xl font-bold">{a.title}</h2><p className="mt-1 text-ink/70">{a.text}</p></div>
            </div>
          ))}
        </div>
      </section>

      <CtaBand />
    </>
  )
}
