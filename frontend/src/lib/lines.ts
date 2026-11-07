import type { InvoiceLine, LineKind } from './types'
import { round2 } from './format'

/** Une ligne prête à afficher dans un DQE (écran, impression, Excel). */
export type Row =
  | { type: 'section'; label: string }
  | { type: 'group'; label: string }
  | { type: 'line'; number: string; label: string; unit: string; quantity: number; unitPrice: number; amount: number; sub: boolean }
  | { type: 'sectionTotal'; label: string; amount: number }

export const priced = (k: LineKind) => k === 'ITEM' || k === 'SUBITEM'

const letters = 'abcdefghijklmnopqrstuvwxyz'

/**
 * Numérotation façon DQE :
 * - chaque ITEM reçoit le numéro suivant ;
 * - un GROUP (« F/P de Prise de Courant ») n'a pas de numéro : c'est sa première sous-ligne qui le porte ;
 * - les SUBITEM sont lettrés a/, b/, c/… ;
 * - chaque SECTION (lot) est suivie de sa ligne « TOTAL … » quand plusieurs lignes la composent.
 */
export function buildRows(lines: Pick<InvoiceLine, 'kind' | 'description' | 'unit' | 'quantity' | 'unitPrice'>[]): Row[] {
  const rows: Row[] = []
  let n = 0
  let sub = -1               // index de la sous-ligne dans le groupe courant (-1 = pas de groupe)
  let section: string | null = null
  let sectionSum = 0
  const closeSection = () => {
    if (section !== null) rows.push({ type: 'sectionTotal', label: `TOTAL ${section}`, amount: round2(sectionSum) })
    section = null
    sectionSum = 0
  }
  for (const l of lines) {
    if (l.kind === 'SECTION') {
      closeSection()
      section = l.description
      sub = -1
      rows.push({ type: 'section', label: l.description })
    } else if (l.kind === 'GROUP') {
      sub = 0
      rows.push({ type: 'group', label: l.description })
    } else {
      const amount = round2(l.quantity * l.unitPrice)
      sectionSum += amount
      if (l.kind === 'SUBITEM' && sub >= 0) {
        const number = sub === 0 ? String(++n) : ''
        rows.push({ type: 'line', number, label: `${letters[sub % 26]}/ ${l.description}`, unit: l.unit ?? '', quantity: l.quantity, unitPrice: l.unitPrice, amount, sub: true })
        sub++
      } else {
        sub = -1
        rows.push({ type: 'line', number: String(++n), label: l.description, unit: l.unit ?? '', quantity: l.quantity, unitPrice: l.unitPrice, amount, sub: false })
      }
    }
  }
  closeSection()
  return rows
}

/** « 840 000,00 » : montant sans le symbole, comme dans les colonnes d'un DQE. */
export const amount2 = (n: number) => n.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
