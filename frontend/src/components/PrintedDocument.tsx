import { Link } from 'react-router-dom'
import { useCompany } from '../lib/company'
import { amountInWords, dateFr, num } from '../lib/format'
import { amount2, buildRows } from '../lib/lines'
import type { Client, InvoiceLine, Project } from '../lib/types'

interface Props {
  kind: 'invoice' | 'quote'
  number: string | null
  issueDate: string | null
  secondDate: string | null       // échéance (facture) ou validité (devis)
  title: string | null
  subtitle: string | null
  client: Client | null
  project: Project | null
  lines: InvoiceLine[]
  vatRate: number
  totalHt: number
  totalVat: number
  totalTtc: number
  notes: string | null
  paidAmount?: number
}

const cell = 'border border-ink/80 px-2 py-1'
const grey = 'bg-[#d9d9d9] print:bg-[#d9d9d9]'

/**
 * Le document remis au client, présenté comme un « Devis quantitatif et estimatif » (DQE) :
 * titre encadré, tableau quadrillé N° / Désignation / Unité / Quantité / Prix unitaire / Montant,
 * lignes de lot grisées, total (avec TVA seulement si un taux est appliqué), somme en lettres, signature.
 */
export default function PrintedDocument(p: Props) {
  const company = useCompany()
  const quote = p.kind === 'quote'
  const paid = p.paidAmount ?? 0
  const withVat = p.vatRate > 0
  const words = amountInWords(p.totalTtc).replace(/^./, (c) => c.toUpperCase())
  const rows = buildRows(p.lines)
  return (
    <article className="mx-auto max-w-4xl rounded-lg border border-line bg-white p-6 text-[13px] shadow-lift sm:p-9 print:max-w-none print:border-0 print:p-0 print:shadow-none [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
      {/* En-tête de l'entreprise */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/30 pb-3 text-xs leading-snug">
        <div className="flex items-start gap-3">
          {company.logo && <img src={company.logo} alt="" className="h-16 w-auto max-w-[9rem] object-contain" />}
          <div>
          <p className="font-display text-xl font-bold">{company.name}</p>
          {(company.legalForm || company.capital) && <p>{[company.legalForm, company.capital && `au capital de ${company.capital}`].filter(Boolean).join(' ')}</p>}
          {[company.address, company.city].filter(Boolean).length > 0 && <p>{[company.address, company.city].filter(Boolean).join(', ')}</p>}
          {(company.phone || company.email) && <p>{[company.phone && `Tél. ${company.phone}`, company.email].filter(Boolean).join(' – ')}</p>}
          {(company.rc || company.nif) && <p>{[company.rc && `RC : ${company.rc}`, company.nif && `NIF : ${company.nif}`].filter(Boolean).join(' – ')}</p>}
          {(company.nis || company.ai) && <p>{[company.nis && `NIS : ${company.nis}`, company.ai && `AI : ${company.ai}`].filter(Boolean).join(' – ')}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold">{quote ? 'Devis' : 'Facture'} n° {p.number ?? 'BROUILLON'}</p>
          <p>Date : {p.issueDate ? dateFr(p.issueDate) : '—'}</p>
          {p.secondDate && <p>{quote ? 'Valable jusqu’au' : 'Échéance'} : {dateFr(p.secondDate)}</p>}
          <p className="mt-2 font-semibold">{quote ? 'Client' : 'Facturé à'} : {p.client?.name}</p>
          {p.client?.address && <p>{[p.client.address, [p.client.postalCode, p.client.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</p>}
          {(p.client?.siret || p.client?.vatNumber) && <p>{[p.client?.siret && `RC : ${p.client.siret}`, p.client?.vatNumber && `NIF : ${p.client.vatNumber}`].filter(Boolean).join(' – ')}</p>}
          {p.project && <p>Chantier : <Link to={`/admin/chantiers/${p.project.id}`} className="print:no-underline">{p.project.name}</Link></p>}
        </div>
      </header>

      {/* Titres façon DQE */}
      {p.title && <p className="mt-5 border-2 border-ink px-3 py-2 text-center text-[15px] font-bold underline underline-offset-2">{p.title}</p>}
      <p className="mt-3 text-center text-[15px] font-bold underline underline-offset-2">{quote ? 'DEVIS QUANTITATIF ET ESTIMATIF' : 'FACTURE'}</p>
      {p.subtitle && <p className="mt-1 text-center font-bold">{p.subtitle}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className={`${grey} text-center font-bold`}>
              <th className={`${cell} w-10`}>N°</th>
              <th className={cell}>DESIGNATION DES TRAVAUX</th>
              <th className={`${cell} w-14`}>Unité</th>
              <th className={`${cell} w-20`}>Quantité</th>
              <th className={`${cell} w-28`}>Prix Unitaire</th>
              <th className={`${cell} w-32`}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              if (r.type === 'section') return <tr key={i}><td colSpan={6} className={`${cell} ${grey} text-center font-bold`}>{r.label}</td></tr>
              if (r.type === 'group') return (
                <tr key={i}><td className={cell} /><td className={`${cell} font-semibold`}>{r.label}</td><td className={cell} /><td className={cell} /><td className={cell} /><td className={cell} /></tr>
              )
              if (r.type === 'sectionTotal') return (
                <tr key={i} className={`${grey} font-bold`}><td colSpan={5} className={`${cell} text-right`}>{r.label}</td><td className={`${cell} whitespace-nowrap text-right tabular-nums`}>{amount2(r.amount)}</td></tr>
              )
              return (
                <tr key={i}>
                  <td className={`${cell} text-center`}>{r.number}</td>
                  <td className={`${cell} ${r.sub ? 'pl-4' : ''}`}>{r.label}</td>
                  <td className={`${cell} text-center`}>{r.unit}</td>
                  <td className={`${cell} whitespace-nowrap text-right tabular-nums`}>{amount2(r.quantity)}</td>
                  <td className={`${cell} whitespace-nowrap text-right tabular-nums`}>{amount2(r.unitPrice)}</td>
                  <td className={`${cell} whitespace-nowrap text-right tabular-nums`}>{amount2(r.amount)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="font-bold">
            {withVat ? <>
              <tr className={grey}><td colSpan={5} className={`${cell} text-right`}>TOTAL HT</td><td className={`${cell} whitespace-nowrap text-right tabular-nums`}>{amount2(p.totalHt)}</td></tr>
              <tr className={grey}><td colSpan={5} className={`${cell} text-right`}>TVA {num(p.vatRate)} %</td><td className={`${cell} whitespace-nowrap text-right tabular-nums`}>{amount2(p.totalVat)}</td></tr>
              <tr className={grey}><td colSpan={5} className={`${cell} text-right`}>TOTAL TTC</td><td className={`${cell} whitespace-nowrap text-right tabular-nums`}>{amount2(p.totalTtc)}</td></tr>
            </> : (
              <tr className={grey}><td colSpan={5} className={`${cell} text-right`}>TOTAL GÉNÉRAL</td><td className={`${cell} whitespace-nowrap text-right tabular-nums`}>{amount2(p.totalTtc)}</td></tr>
            )}
            {!quote && paid > 0 && <>
              <tr><td colSpan={5} className={`${cell} text-right font-normal`}>Déjà réglé</td><td className={`${cell} whitespace-nowrap text-right font-normal tabular-nums`}>− {amount2(paid)}</td></tr>
              <tr><td colSpan={5} className={`${cell} text-right`}>RESTE À PAYER</td><td className={`${cell} whitespace-nowrap text-right tabular-nums`}>{amount2(Math.max(0, p.totalTtc - paid))}</td></tr>
            </>}
          </tfoot>
        </table>
      </div>
      <p className="mt-1 text-right text-xs text-ink/60">Montants en dinars algériens (DA)</p>

      <p className="mt-4 italic">
        {quote ? 'Arrêté le présent Devis Quantitatif et Estimatif' : 'Arrêtée la présente facture'}{withVat ? ' en TTC' : ''} à la somme de : <strong className="not-italic">{words}</strong>.
      </p>
      {p.notes && <p className="mt-3 whitespace-pre-line">{p.notes}</p>}
      {!quote && company.bank && <p className="mt-3 whitespace-pre-line"><span className="font-semibold">Règlement :</span> {company.bank}</p>}

      <div className="mt-8 grid grid-cols-2 gap-6 print:break-inside-avoid">
        <div>{quote && <><p className="font-bold">Bon pour accord du client</p><p className="text-xs text-ink/55">Date et signature</p></>}</div>
        <p className="text-center font-bold">{quote ? 'LE SOUMISSIONNAIRE' : 'CACHET ET SIGNATURE'}</p>
      </div>
      <div className="h-20" />
      {company.footer && <footer className="whitespace-pre-line border-t border-line pt-3 text-xs text-ink/55">{company.footer}</footer>}
    </article>
  )
}
