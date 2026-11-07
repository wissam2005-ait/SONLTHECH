/**
 * Export d'un devis ou d'une facture en fichier Excel (.xlsx), au format « Devis quantitatif et estimatif ».
 * Le fichier est construit ici, sans bibliothèque : un .xlsx est une archive ZIP de fichiers XML.
 * Les montants sont des formules (Montant = Quantité × Prix unitaire, totaux = SOMME) :
 * modifier une quantité dans Excel recalcule tout.
 */
import { amountInWords, dateFr } from './format'
import { buildRows } from './lines'
import type { InvoiceLine } from './types'

export interface ExportDoc {
  kind: 'invoice' | 'quote'
  fileName: string
  number: string | null
  issueDate: string | null
  title: string | null
  subtitle: string | null
  clientName: string
  companyName: string
  vatRate: number
  lines: InvoiceLine[]
}

/* ---------- styles (index dans cellXfs) ---------- */
const S = { text: 1, center: 2, num: 3, head: 4, section: 5, totLabel: 6, totNum: 7, titleBox: 8, boldUnderline: 9, bold: 10, italic: 11, boldLeft: 12, groupText: 13 } as const

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>
<fonts count="5">
<font><sz val="10"/><name val="Arial"/></font>
<font><b/><sz val="10"/><name val="Arial"/></font>
<font><b/><u/><sz val="11"/><name val="Arial"/></font>
<font><i/><sz val="10"/><name val="Arial"/></font>
<font><b/><u/><sz val="12"/><name val="Arial"/></font>
</fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border>
<border><left style="medium"/><right style="medium"/><top style="medium"/><bottom style="medium"/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="14">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="164" fontId="1" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

/* ---------- feuille ---------- */
const COLS = ['A', 'B', 'C', 'D', 'E', 'F']
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

type Cell = { s: number; text?: string; num?: number; formula?: string }

class Sheet {
  rows: { cells: Cell[]; height?: number }[] = []
  merges: string[] = []
  /** Ajoute une ligne de 6 cellules ; retourne son numéro Excel (1, 2…). */
  add(cells: Cell[], height?: number) {
    while (cells.length < 6) cells.push({ s: cells[cells.length - 1]?.s ?? 0 })
    this.rows.push({ cells, height })
    return this.rows.length
  }
  merge(r: number, from: number, to: number) { this.merges.push(`${COLS[from]}${r}:${COLS[to]}${r}`) }
  xml() {
    const body = this.rows.map((row, i) => {
      const r = i + 1
      const cells = row.cells.map((c, j) => {
        const ref = `${COLS[j]}${r}`
        if (c.formula !== undefined) return `<c r="${ref}" s="${c.s}"><f>${esc(c.formula)}</f>${c.num !== undefined ? `<v>${c.num}</v>` : ''}</c>`
        if (c.num !== undefined) return `<c r="${ref}" s="${c.s}"><v>${c.num}</v></c>`
        if (c.text !== undefined && c.text !== '') return `<c r="${ref}" s="${c.s}" t="inlineStr"><is><t xml:space="preserve">${esc(c.text)}</t></is></c>`
        return `<c r="${ref}" s="${c.s}"/>`
      }).join('')
      return `<row r="${r}"${row.height ? ` ht="${row.height}" customHeight="1"` : ''}>${cells}</row>`
    }).join('')
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>
<cols><col min="1" max="1" width="6" customWidth="1"/><col min="2" max="2" width="58" customWidth="1"/><col min="3" max="3" width="8" customWidth="1"/>
<col min="4" max="4" width="11" customWidth="1"/><col min="5" max="5" width="15" customWidth="1"/><col min="6" max="6" width="18" customWidth="1"/></cols>
<sheetData>${body}</sheetData>
${this.merges.length ? `<mergeCells count="${this.merges.length}">${this.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}
<pageMargins left="0.5" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>
</worksheet>`
  }
}

function buildSheet(d: ExportDoc): Sheet {
  const sh = new Sheet()
  const quote = d.kind === 'quote'
  const blank = (s = 0): Cell => ({ s })

  if (d.title) { const r = sh.add([{ s: S.titleBox, text: d.title }, blank(S.titleBox), blank(S.titleBox), blank(S.titleBox), blank(S.titleBox), blank(S.titleBox)], 32); sh.merge(r, 0, 5) }
  { const r = sh.add([{ s: S.boldUnderline, text: quote ? 'DEVIS QUANTITATIF ET ESTIMATIF' : `FACTURE${d.number ? ` N° ${d.number}` : ''}` }]); sh.merge(r, 0, 5) }
  if (d.subtitle) { const r = sh.add([{ s: S.bold, text: d.subtitle }]); sh.merge(r, 0, 5) }
  {
    const info = [quote && d.number ? `N° ${d.number}` : '', d.issueDate ? `du ${dateFr(d.issueDate)}` : '', d.clientName ? `Client : ${d.clientName}` : '', `Entreprise : ${d.companyName}`].filter(Boolean).join('     ')
    const r = sh.add([{ s: 0, text: info }]); sh.merge(r, 0, 5)
  }
  sh.add([blank()])

  sh.add(['N°', 'DESIGNATION DES TRAVAUX', 'Unité', 'Quantité', 'Prix Unitaire', 'Montant'].map((t) => ({ s: S.head, text: t })), 24)

  const lineRefs: string[] = []                 // cellules F des lignes chiffrées (pour le total HT)
  let sectionStart = 0
  let firstDataRow = 0
  let lastLineRow = 0
  const ranges: [number, number][] = []          // plages contiguës de lignes du tableau (hors totaux)
  const pushRow = (r: number) => {
    const last = ranges[ranges.length - 1]
    if (last && last[1] === r - 1) last[1] = r; else ranges.push([r, r])
  }
  let htValue = 0

  for (const row of buildRows(d.lines)) {
    if (row.type === 'section') {
      const r = sh.add([{ s: S.section, text: row.label }, blank(S.section), blank(S.section), blank(S.section), blank(S.section), blank(S.section)])
      sh.merge(r, 0, 5)
      sectionStart = r + 1
    } else if (row.type === 'group') {
      const r = sh.add([blank(S.center), { s: S.groupText, text: row.label }, blank(S.center), blank(S.num), blank(S.num), blank(S.num)])
      pushRow(r); if (!firstDataRow) firstDataRow = r
    } else if (row.type === 'line') {
      const r = sh.rows.length + 1
      sh.add([
        { s: S.center, text: row.number }, { s: S.text, text: row.label }, { s: S.center, text: row.unit },
        { s: S.num, num: row.quantity }, { s: S.num, num: row.unitPrice }, { s: S.num, formula: `ROUND(D${r}*E${r},2)`, num: row.amount },
      ])
      pushRow(r); lineRefs.push(`F${r}`); lastLineRow = r; if (!firstDataRow) firstDataRow = r
      htValue += row.amount
    } else {
      const from = sectionStart || firstDataRow
      const r = sh.add([{ s: S.totLabel, text: row.label }, blank(S.totLabel), blank(S.totLabel), blank(S.totLabel), blank(S.totLabel),
        { s: S.totNum, formula: from && lastLineRow >= from ? `SUM(F${from}:F${sh.rows.length})` : '0', num: row.amount }])
      sh.merge(r, 0, 4)
    }
  }

  const htFormula = ranges.length ? `SUM(${ranges.map(([a, b]) => (a === b ? `F${a}` : `F${a}:F${b}`)).join(',')})` : '0'
  const ht = Math.round(htValue * 100) / 100
  const withVat = d.vatRate > 0
  const tva = withVat ? Math.round(ht * d.vatRate) / 100 : 0
  const totalRow = (label: string, formula: string, value: number) => {
    const r = sh.add([{ s: S.totLabel, text: label }, blank(S.totLabel), blank(S.totLabel), blank(S.totLabel), blank(S.totLabel), { s: S.totNum, formula, num: value }])
    sh.merge(r, 0, 4)
    return r
  }
  if (withVat) {
    const rHt = totalRow('TOTAL HT', htFormula, ht)
    const rTva = totalRow(`TVA ${String(d.vatRate).replace('.', ',')} %`, `ROUND(F${rHt}*${d.vatRate}/100,2)`, tva)
    totalRow('TOTAL TTC', `F${rHt}+F${rTva}`, Math.round((ht + tva) * 100) / 100)
  } else {
    totalRow('TOTAL GÉNÉRAL', htFormula, ht)
  }

  sh.add([blank()])
  const words = amountInWords(ht + tva)
  const sentence = `${quote ? 'Arrêté le présent Devis Quantitatif et Estimatif' : 'Arrêtée la présente facture'}${withVat ? ' en TTC' : ''} à la somme de : ${words.charAt(0).toUpperCase()}${words.slice(1)}.`
  const rW = sh.add([{ s: S.italic, text: sentence }], 30); sh.merge(rW, 0, 5)
  sh.add([blank()])
  const rSig = sh.add([blank(), blank(), blank(), { s: S.bold, text: quote ? 'LE SOUMISSIONNAIRE' : "CACHET ET SIGNATURE" }]); sh.merge(rSig, 3, 5)
  return sh
}

/* ---------- archive ZIP (méthode « stockée », sans compression) ---------- */
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 }
  return t
})()
function crc32(b: Uint8Array) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }

function zip(files: { name: string; data: string }[]): Uint8Array {
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true)
    local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true); local.setUint16(26, name.length, true)
    chunks.push(new Uint8Array(local.buffer), name, data)
    const cen = new DataView(new ArrayBuffer(46))
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true)
    cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true); cen.setUint16(28, name.length, true)
    cen.setUint32(42, offset, true)
    central.push(new Uint8Array(cen.buffer), name)
    offset += 30 + name.length + data.length
  }
  const cenSize = central.reduce((s, c) => s + c.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true)
  end.setUint32(12, cenSize, true); end.setUint32(16, offset, true)
  const all = [...chunks, ...central, new Uint8Array(end.buffer)]
  const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0))
  let p = 0
  for (const c of all) { out.set(c, p); p += c.length }
  return out
}

export function buildXlsx(d: ExportDoc): Uint8Array {
  const sheetName = d.kind === 'quote' ? 'DQE' : 'Facture'
  return zip([
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: stylesXml },
    { name: 'xl/worksheets/sheet1.xml', data: buildSheet(d).xml() },
  ])
}

/** Télécharge le fichier Excel dans le navigateur. */
export function downloadXlsx(d: ExportDoc) {
  const blob = new Blob([buildXlsx(d)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${d.fileName}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
