import RequestForm from '../components/RequestForm'
import { Icon } from '../components/icons'
import { PageHero } from '../components/site'
import { site } from '../lib/site'
import { telHref, usePageTitle, usePublicCompany, waHref } from '../lib/publicCompany'

export default function Devis() {
  usePageTitle('Devis gratuit')
  const { phone } = usePublicCompany()
  return (
    <>
      <PageHero kicker="Devis gratuit" title="Recevez un devis clair et détaillé"
        text="Décrivez vos travaux en quelques lignes. Nous revenons vers vous pour préciser le besoin, puis nous vous remettons un devis poste par poste, sans engagement." />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1.6fr_1fr]">
        <RequestForm kind="QUOTE" />
        <aside className="h-fit lg:sticky lg:top-28">
          <h2 className="text-2xl font-bold">Comment ça se passe ?</h2>
          <ol className="mt-6 space-y-6 border-l-2 border-line pl-6">
            {site.steps.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="absolute -left-[37px] flex h-6 w-6 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-volt">{i + 1}</span>
                <p className="font-bold">{s.title}</p>
                <p className="text-sm text-ink/65">{s.text}</p>
              </li>
            ))}
          </ol>
          {phone && (
            <a href={telHref(phone)} className="mt-8 flex items-center gap-3 rounded-xl bg-panel p-5 transition hover:bg-volt/30">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-volt"><Icon name="phone" size={20} /></span>
              <span><span className="block text-sm text-ink/60">Urgent ? Appelez-nous</span><span className="text-lg font-bold">{phone}</span></span>
            </a>
          )}
          {waHref() && (
            <a href={waHref('Bonjour, je souhaite un devis pour des travaux d’électricité.')!} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center gap-3 rounded-xl bg-[#25D366]/10 p-5 transition hover:bg-[#25D366]/20">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white"><Icon name="whatsapp" size={22} /></span>
              <span><span className="block text-sm text-ink/60">Plus simple ?</span><span className="text-lg font-bold">Envoyez des photos sur WhatsApp</span></span>
            </a>
          )}
        </aside>
      </div>
    </>
  )
}
