// Download a table as an Excel file (.xlsx) or a CSV. The Excel file is written here, without a library: an .xlsx is a zip of a few XML files.
// It keeps the header row and the first columns frozen, has a filter on every column, and colours the status cells.

// Cell styles, by number (see styles() below).
export const ST = { text: 0, head: 1, ok: 2, review: 3, miss: 4, na: 5, headLeft: 6, rej: 7 } as const

export interface XCell {
  v: string
  s?: number
}
export interface XSheet {
  name: string
  rows: XCell[][]
  widths: number[] // column widths, in characters
  freeze?: { cols: number; rows: number } // how many columns and rows stay in view
  filter?: boolean // a filter arrow on the header row
}

const enc = new TextEncoder()

const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
const crc32 = (b: Uint8Array) => {
  let c = 0xffffffff
  for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// A zip with the files stored as they are (no compression). Enough for a spreadsheet.
function zip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const name = enc.encode(f.name)
    const crc = crc32(f.data)
    const local = new Uint8Array(30 + name.length)
    const l = new DataView(local.buffer)
    l.setUint32(0, 0x04034b50, true)
    l.setUint16(4, 20, true)
    l.setUint16(6, 0x0800, true) // names are UTF-8
    l.setUint16(12, 0x0021, true) // 1 Jan 1980
    l.setUint32(14, crc, true)
    l.setUint32(18, f.data.length, true)
    l.setUint32(22, f.data.length, true)
    l.setUint16(26, name.length, true)
    local.set(name, 30)
    parts.push(local, f.data)

    const head = new Uint8Array(46 + name.length)
    const c = new DataView(head.buffer)
    c.setUint32(0, 0x02014b50, true)
    c.setUint16(4, 20, true)
    c.setUint16(6, 20, true)
    c.setUint16(8, 0x0800, true)
    c.setUint16(14, 0x0021, true)
    c.setUint32(16, crc, true)
    c.setUint32(20, f.data.length, true)
    c.setUint32(24, f.data.length, true)
    c.setUint16(28, name.length, true)
    c.setUint32(42, offset, true)
    head.set(name, 46)
    central.push(head)
    offset += local.length + f.data.length
  }
  const size = central.reduce((n, c) => n + c.length, 0)
  const end = new Uint8Array(22)
  const e = new DataView(end.buffer)
  e.setUint32(0, 0x06054b50, true)
  e.setUint16(8, files.length, true)
  e.setUint16(10, files.length, true)
  e.setUint32(12, size, true)
  e.setUint32(16, offset, true)
  const all = [...parts, ...central, end]
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of all) {
    out.set(p, at)
    at += p.length
  }
  return out
}

const esc = (s: string) =>
  // eslint-disable-next-line no-control-regex
  s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// A, B, … Z, AA, AB …
const letters = (n: number) => {
  let s = ''
  for (let i = n + 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s
  return s
}

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'

function sheetXml(sh: XSheet, selected: boolean): string {
  const lastCol = Math.max(...sh.rows.map((r) => r.length), 1) - 1
  const view = sh.freeze
    ? `<pane${sh.freeze.cols ? ` xSplit="${sh.freeze.cols}"` : ''}${sh.freeze.rows ? ` ySplit="${sh.freeze.rows}"` : ''} topLeftCell="${letters(sh.freeze.cols)}${sh.freeze.rows + 1}" activePane="${sh.freeze.cols && sh.freeze.rows ? 'bottomRight' : sh.freeze.rows ? 'bottomLeft' : 'topRight'}" state="frozen"/>`
    : ''
  const cols = sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')
  const rows = sh.rows
    .map((r, ri) => {
      const cells = r.map((c, ci) => `<c r="${letters(ci)}${ri + 1}" s="${c.s ?? 0}" t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`).join('')
      return `<row r="${ri + 1}"${ri === 0 && sh.freeze?.rows ? ' ht="34" customHeight="1"' : ''}>${cells}</row>`
    })
    .join('')
  const filter = sh.filter ? `<autoFilter ref="A1:${letters(lastCol)}${sh.rows.length}"/>` : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}"><sheetViews><sheetView workbookViewId="0"${selected ? ' tabSelected="1"' : ''}>${view}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${cols}</cols><sheetData>${rows}</sheetData>${filter}</worksheet>`
}

function styles(): string {
  const fill = (rgb: string) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${rgb}"/><bgColor indexed="64"/></patternFill></fill>`
  const side = (n: string) => `<${n} style="thin"><color rgb="FFE3E8EC"/></${n}>`
  const xf = (font: number, fillId: number, h: 'left' | 'center', wrap = false) =>
    `<xf numFmtId="0" fontId="${font}" fillId="${fillId}" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="${h}" vertical="center"${wrap ? ' wrapText="1"' : ''}/></xf>`
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}">
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="8"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fill('0F7B6C')}${fill('E4F5EE')}${fill('FEF0D5')}${fill('FDE8E6')}${fill('EEF1F3')}${fill('F4B8B1')}</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border>${side('left')}${side('right')}${side('top')}${side('bottom')}<diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">${xf(0, 0, 'left')}${xf(2, 2, 'center', true)}${xf(0, 3, 'center')}${xf(0, 4, 'center')}${xf(0, 5, 'center')}${xf(0, 6, 'center')}${xf(2, 2, 'left', true)}${xf(1, 7, 'center')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
}

export function buildXlsx(sheets: XSheet[]): Blob {
  const names = sheets.map((s) => esc(s.name.slice(0, 31)))
  const first = sheets[0]
  const filterName =
    first?.filter && first.rows.length > 0
      ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${names[0]}'!$A$1:$${letters(Math.max(...first.rows.map((r) => r.length), 1) - 1)}$${first.rows.length}</definedName></definedNames>`
      : ''
  const files = [
    {
      name: '[Content_Types].xml',
      xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    },
    {
      name: '_rels/.rels',
      xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${filterName}</workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: 'xl/styles.xml', xml: styles() },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, xml: sheetXml(s, i === 0) })),
  ]
  const bytes = zip(files.map((f) => ({ name: f.name, data: enc.encode(f.xml) })))
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// Opens in Excel too: the byte-order mark makes it read accents and the rupee sign correctly.
export function buildCsv(rows: string[][]): Blob {
  const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return new Blob(['﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
}

export function download(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// A name that is safe as a file name.
export const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim()
