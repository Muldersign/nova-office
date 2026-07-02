import { calculateTotals, type DocumentLine } from './business.ts'

export type PrintableDocument = {
  type: 'invoice' | 'quote'
  number: string
  status: string
  companyName: string
  companyVat: string
  companyChamber: string
  customerName: string
  customerAddress: string
  date: string
  dueDate?: string
  validUntil?: string
  lines: DocumentLine[]
}

export function createPrintableDocumentHtml(document: PrintableDocument) {
  const totals = calculateTotals(document.lines)
  const label = document.type === 'invoice' ? 'Factuur' : 'Offerte'
  const secondaryDate = document.type === 'invoice'
    ? `Vervaldatum: ${escapeHtml(document.dueDate ?? '-')}`
    : `Geldig tot: ${escapeHtml(document.validUntil ?? '-')}`

  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${label} ${escapeHtml(document.number)} - NOVA Office</title>
  <style>
    body { margin: 0; font-family: Inter, Arial, sans-serif; color: #101828; background: #f5f7fb; }
    main { max-width: 880px; margin: 32px auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 40px; }
    header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 28px; }
    h1 { margin: 0 0 8px; font-size: 36px; }
    h2 { margin: 0 0 8px; font-size: 18px; }
    p, span { color: #667085; }
    table { width: 100%; border-collapse: collapse; margin: 32px 0; }
    th { text-align: left; color: #667085; font-size: 12px; text-transform: uppercase; }
    th, td { padding: 14px 10px; border-bottom: 1px solid #e5e7eb; }
    .right { text-align: right; }
    .summary { margin-left: auto; width: min(320px, 100%); display: grid; gap: 10px; }
    .summary div { display: flex; justify-content: space-between; }
    .total { font-size: 22px; font-weight: 800; color: #101828; }
    .badge { display: inline-flex; padding: 8px 12px; border-radius: 7px; background: #e8f1ff; color: #1877f2; font-weight: 700; }
    @media print { body { background: #fff; } main { margin: 0; border: 0; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <span class="badge">${escapeHtml(document.status)}</span>
        <h1>${label} ${escapeHtml(document.number)}</h1>
        <p>Datum: ${escapeHtml(document.date)}<br>${secondaryDate}</p>
      </div>
      <div>
        <h2>${escapeHtml(document.companyName)}</h2>
        <p>KvK ${escapeHtml(document.companyChamber)}<br>BTW ${escapeHtml(document.companyVat)}</p>
      </div>
    </header>
    <section>
      <h2>Voor</h2>
      <p>${escapeHtml(document.customerName)}<br>${escapeHtml(document.customerAddress)}</p>
    </section>
    <table>
      <thead><tr><th>Omschrijving</th><th class="right">Aantal</th><th class="right">Prijs</th><th class="right">BTW</th><th class="right">Totaal</th></tr></thead>
      <tbody>
        ${document.lines.map((line) => {
          const lineTotal = line.quantity * line.price * (1 + line.vat / 100)
          return `<tr><td>${escapeHtml(line.description)}</td><td class="right">${line.quantity}</td><td class="right">${formatEuro(line.price)}</td><td class="right">${line.vat}%</td><td class="right">${formatEuro(lineTotal)}</td></tr>`
        }).join('')}
      </tbody>
    </table>
    <section class="summary">
      <div><span>Subtotaal</span><strong>${formatEuro(totals.subtotal)}</strong></div>
      <div><span>BTW</span><strong>${formatEuro(totals.vatTotal)}</strong></div>
      <div class="total"><span>Totaal</span><strong>${formatEuro(totals.total)}</strong></div>
    </section>
  </main>
</body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatEuro(value: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value)
}
