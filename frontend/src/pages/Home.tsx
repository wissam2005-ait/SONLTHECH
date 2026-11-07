import { Link } from 'react-router-dom'
import RealisationsGallery from '../components/RealisationsGallery'
import { Icon } from '../components/icons'
import { CircuitPattern, CtaBand, SectionTitle } from '../components/site'
import { site } from '../lib/site'
import { telHref, usePageTitle, usePublicCompany } from '../lib/publicCompany'

/** Illustration : un tableau électrique stylisé, l'objet emblématique du métier */
function PanelIllustration() {
  const circuits = [
    ['Éclairage', true], ['Prises séjour', true], ['Cuisine', true], ['Climatisation', true],
    ['Chauffe-eau', true], ['Prises chambres', true], ['Extérieur', false], ['Volets', true],
  ] as const
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="absolute -inset-6 rounded-[2rem] bg-volt/20 blur-2xl" />
      <div className="relative rounded-2xl border border-white/15 bg-gradient-to-b from-[#173a5e] to-[#0e2741] p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-white/80">
            <Icon name="gauge" size={16} className="text-volt" /> Tableau principal
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-wire-green/25 px-2.5 py-1 text-xs font-semibold text-[#7be3a6]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7be3a6]" /> Sous tension
          </span>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2.5">
          {circuits.map(([label, on]) => (
            <div key={label} className="rounded-lg bg-[#0a1c2e] p-2 ring-1 ring-white/10">
              <div className="mx-auto flex h-14 w-8 flex-col justify-between rounded-md bg-[#e9edf1] p-1">
                <div className={`h-6 rounded-sm transition ${on ? 'bg-ink' : 'mt-auto bg-wire-red'}`} />
              </div>
              <p className="mt-1.5 truncate text-center text-[10px] text-white/60">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-lg bg-[#0a1c2e] px-3 py-2.5 ring-1 ring-white/10">
          <span className="text-xs text-white/60">Différentiel 30 mA</span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-volt"><Icon name="shield" size={14} /> Protégé</span>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-10 hidden items-center gap-3 rounded-xl bg-white px-4 py-3 text-ink shadow-xl sm:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-volt"><Icon name="check" size={18} strokeWidth={2.4} /></span>
        <div className="text-sm leading-tight"><p className="font-bold">Devis gratuit</p><p className="text-ink/60">détaillé poste par poste</p></div>
      </div>
    </div>
  )
}

export default function Home() {
  usePageTitle('')
  const { phone } = usePublicCompany()

  return (
    <>
      {/* Bandeau d'accueil */}
      <section className="relative overflow-hidden bg-ink text-white">
        <CircuitPattern className="text-white/[0.045]" />
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-navy blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-volt/30 bg-volt/10 px-3 py-1 text-sm font-semibold text-volt">
              <Icon name="bolt" size={14} strokeWidth={2.4} /> {site.hero.kicker}
            </p>
            <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-[4.2rem]">{site.hero.title}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">{site.hero.text}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/devis" className="flex items-center gap-2 rounded-md bg-volt px-6 py-3.5 font-bold text-ink shadow-[0_8px_30px_-8px_rgba(245,211,0,.6)] transition hover:brightness-95">
                Demander un devis gratuit <Icon name="arrow" size={18} strokeWidth={2.2} />
              </Link>
              {phone
                ? <a href={telHref(phone)} className="flex items-center gap-2 rounded-md border border-white/30 px-6 py-3.5 font-semibold transition hover:border-white hover:bg-white/5"><Icon name="phone" size={18} /> {phone}</a>
                : <Link to="/realisations" className="rounded-md border border-white/30 px-6 py-3.5 font-semibold transition hover:border-white hover:bg-white/5">Voir nos réalisations</Link>}
            </div>
            <p className="mt-8 flex items-center gap-2 text-sm text-white/60"><Icon name="pin" size={16} className="text-volt" /> Intervention à {site.area}</p>
          </div>
          <PanelIllustration />
        </div>
      </section>

      {/* Engagements */}
      <section className="relative z-10 mx-auto -mt-8 max-w-6xl px-4">
        <ul className="grid gap-px overflow-hidden rounded-xl bg-line shadow-lift sm:grid-cols-2 lg:grid-cols-4">
          {site.promises.map((p) => (
            <li key={p.title} className="flex items-start gap-3 bg-white p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-volt"><Icon name={p.icon} size={20} /></span>
              <div><p className="font-bold">{p.title}</p><p className="text-sm text-ink/65">{p.text}</p></div>
            </li>
          ))}
        </ul>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="services-title">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionTitle id="services-title" kicker="Nos services" title="Tout ce qui touche à votre électricité" text="Du dépannage ponctuel à l’installation complète d’un bâtiment." />
          <Link to="/services" className="flex items-center gap-2 font-semibold text-ink hover:text-navy">Tous les services <Icon name="arrow" size={18} /></Link>
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {site.services.slice(0, 6).map((s) => (
            <li key={s.slug}>
              <Link to={`/services#${s.slug}`} className="group flex h-full flex-col rounded-xl border border-line bg-white p-6 transition hover:-translate-y-1 hover:border-ink/30 hover:shadow-lift">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-panel text-ink transition group-hover:bg-volt"><Icon name={s.icon} size={24} /></span>
                <h3 className="mt-5 text-2xl font-bold">{s.title}</h3>
                <p className="mt-2 flex-1 text-ink/70">{s.short}</p>
                <span className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-wire-blue">En savoir plus <Icon name="arrow" size={16} className="transition group-hover:translate-x-1" /></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Pour qui */}
      <section className="bg-panel py-20" aria-labelledby="clients-title">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle id="clients-title" center kicker="Nos clients" title="Particuliers comme professionnels" />
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {site.audiences.map((a) => (
              <li key={a.title} className="rounded-xl bg-white p-7 text-center shadow-lift">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink text-volt"><Icon name={a.icon} size={26} /></span>
                <h3 className="mt-4 text-2xl font-bold">{a.title}</h3>
                <p className="mt-2 text-ink/70">{a.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Méthode */}
      <section className="relative overflow-hidden bg-ink py-20 text-white" aria-labelledby="steps-title">
        <CircuitPattern className="text-white/[0.04]" />
        <div className="relative mx-auto max-w-6xl px-4">
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-volt">Notre méthode</p>
          <h2 id="steps-title" className="mt-2 max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">Un chantier clair, de la demande à la mise en service</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-4">
            {site.steps.map((s, i) => (
              <li key={s.title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-volt font-display text-xl font-bold text-volt">{i + 1}</span>
                  {i < site.steps.length - 1 && <span className="hidden h-px flex-1 bg-gradient-to-r from-volt/60 to-transparent md:block" aria-hidden="true" />}
                </div>
                <h3 className="mt-4 text-2xl font-bold">{s.title}</h3>
                <p className="mt-2 text-white/70">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Réalisations publiées par l'équipe depuis son espace */}
      <RealisationsGallery limit={6} title="Nos dernières réalisations" showMoreLink />

      {/* Questions fréquentes */}
      <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="faq-title">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <SectionTitle id="faq-title" kicker="Questions fréquentes" title="Vous vous demandez…" text="Vous ne trouvez pas votre réponse ? Contactez-nous directement." />
            <Link to="/contact" className="mt-6 inline-flex items-center gap-2 font-semibold text-wire-blue hover:underline">Poser une question <Icon name="arrow" size={16} /></Link>
          </div>
          <div className="divide-y divide-line rounded-xl border border-line">
            {site.faq.map((f) => (
              <details key={f.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                  {f.q}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel transition group-open:rotate-45 group-open:bg-volt"><Icon name="plus" size={16} /></span>
                </summary>
                <p className="mt-3 text-ink/70">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  )
}
