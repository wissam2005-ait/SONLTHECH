import RealisationsGallery from '../components/RealisationsGallery'

export default function Realisations() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12">
      <h1 className="text-4xl font-extrabold">Nos réalisations</h1>
      <RealisationsGallery title={null} emptyMessage="Nos premières réalisations arrivent bientôt." />
    </div>
  )
}
