import RequestForm from '../components/RequestForm'

export default function Contact() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-extrabold">Contact</h1>
      <p className="mb-6 mt-2 text-ink/75">Une question ? Écrivez-nous, nous vous répondons rapidement.</p>
      <RequestForm kind="CONTACT" />
    </div>
  )
}
