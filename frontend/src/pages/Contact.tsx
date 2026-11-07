import { Link } from 'react-router-dom'
import RequestForm from '../components/RequestForm'
import { Icon, type IconName } from '../components/icons'
import { PageHero } from '../components/site'
import { site } from '../lib/site'
import { telHref, usePageTitle, usePublicCompany } from '../lib/publicCompany'

function Info({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-volt text-ink"><Icon name={icon} size={20} /></span>
      <div><p className="text-sm text-white/55">{label}</p><div className="text-lg font-semibold text-white">{children}</div></div>
    </li>
  )
}

export default function Contact() {
  usePageTitle('Contact')
  const { phone, email, address, city } = usePublicCompany()
  const place = [address, city].filter(Boolean).join(', ')
  return (
    <>
      <PageHero kicker="Contact" title="Parlons de votre projet" text="Une question, une panne, un chantier ? Écrivez-nous ou appelez-nous : nous vous répondons rapidement." />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[1fr_1.6fr]">
        <aside className="h-fit rounded-xl bg-ink p-8 text-white lg:sticky lg:top-28">
          <h2 className="text-3xl font-bold">Nos coordonnées</h2>
          <ul className="mt-7 space-y-6">
            {phone && <Info icon="phone" label="Téléphone"><a href={telHref(phone)} className="hover:text-volt">{phone}</a></Info>}
            {email && <Info icon="mail" label="E-mail"><a href={`mailto:${email}`} className="break-all hover:text-volt">{email}</a></Info>}
            <Info icon="pin" label="Zone d’intervention">{place || site.area}</Info>
            {site.hours && <Info icon="clock" label="Horaires">{site.hours}</Info>}
          </ul>
          <div className="mt-8 rounded-lg border border-volt/30 bg-volt/10 p-4 text-sm text-white/80">
            Pour un chantier, utilisez plutôt la <Link to="/devis" className="font-semibold text-volt underline-offset-2 hover:underline">demande de devis</Link> : elle nous permet de préparer une estimation.
          </div>
        </aside>
        <div>
          <h2 className="mb-5 text-3xl font-bold">Envoyer un message</h2>
          <RequestForm kind="CONTACT" />
        </div>
      </div>
    </>
  )
}
