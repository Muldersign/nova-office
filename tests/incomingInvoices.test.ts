import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createIncomingInvoiceDraft, extractTextFromSimplePdf, parseIncomingInvoiceText } from '../src/foundation/incomingInvoices.ts'

const brenqoPdfText = `
Factuur 2026-0001
Status: Concept
Datum: 2026-07-03
Vervalt/geldig tot: 2026-07-17
Van: Muldersign
Voor: Glenn
Regels:
- Adviespakket Groei | aantal 1 | prijs 1250 | btw 21%
- Maandelijkse support | aantal 1 | prijs 395 | btw 21%
Totaal: EUR 1.990,45
`

test('parses supplier, dates, total and VAT from Dutch invoice text', () => {
  const parsed = parseIncomingInvoiceText(brenqoPdfText)

  assert.equal(parsed.supplier, 'Muldersign')
  assert.equal(parsed.invoiceNumber, '2026-0001')
  assert.equal(parsed.invoiceDate, '2026-07-03')
  assert.equal(parsed.dueDate, '2026-07-17')
  assert.equal(parsed.amount, 1990.45)
  assert.equal(parsed.vat, 345.45)
})

test('extracts simple uncompressed PDF text operators', () => {
  const raw = `%PDF-1.4
5 0 obj
<< /Length 80 >>
stream
BT
(Factuur 2026-0001) Tj
(Van: Muldersign) Tj
(Totaal: EUR 1.990,45) Tj
ET
endstream
endobj`
  const text = extractTextFromSimplePdf(new TextEncoder().encode(raw))

  assert.match(text, /Factuur 2026-0001/)
  assert.match(text, /Van: Muldersign/)
  assert.match(text, /Totaal: EUR 1\.990,45/)
})

test('creates incoming invoice draft from uploaded PDF content before falling back to filename', async () => {
  const raw = `%PDF-1.4
(Factuur 2026-0001) Tj
(Datum: 2026-07-03) Tj
(Vervalt/geldig tot: 2026-07-17) Tj
(Van: Muldersign) Tj
(- Adviespakket Groei | aantal 1 | prijs 1250 | btw 21%) Tj
(- Maandelijkse support | aantal 1 | prijs 395 | btw 21%) Tj
(Totaal: EUR 1.990,45) Tj`
  const file = {
    name: 'factuur-2026-0001 (1) - kopie.pdf',
    size: raw.length,
    lastModified: new Date('2026-07-11').getTime(),
    arrayBuffer: async () => new TextEncoder().encode(raw).buffer,
  }

  const draft = await createIncomingInvoiceDraft({ file, companyId: 'comp_1', id: 'incoming_1', today: '2026-07-11' })

  assert.equal(draft.supplier, 'Muldersign')
  assert.equal(draft.invoiceNumber, '2026-0001')
  assert.equal(draft.amount, 1990.45)
  assert.equal(draft.vat, 345.45)
  assert.equal(draft.confidence, 94)
})
