import RealisationsGallery from '../components/RealisationsGallery'
import { CtaBand, PageHero } from '../components/site'
import { usePageTitle } from '../lib/publicCompany'
import { site } from '../lib/site'

export default function Realisations() {
  usePageTitle('Nos réalisations')
  return (
    <>
      <PageHero kicker="Réalisations" title="Nos chantiers en images"
        text={`Installations, rénovations et mises aux normes réalisées par notre équipe à ${site.area}. Cliquez sur une réalisation pour voir toutes ses photos.`} />
      <div className="mx-auto max-w-6xl px-4">
        <RealisationsGallery title={null} emptyMessage="Nos premières réalisations arrivent bientôt." />
      </div>
      <CtaBand />
    </>
  )
}
