import RequestForm from '../components/RequestForm'

export default function Devis() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-extrabold">Demande de devis gratuit</h1>
      <p className="mb-6 mt-2 text-ink/75">Décrivez votre projet : nous revenons vers vous avec un devis détaillé.</p>
      <RequestForm kind="QUOTE" />
    </div>
  )
}
