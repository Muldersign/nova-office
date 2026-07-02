import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPrintableDocumentHtml } from '../src/foundation/documents.ts'

test('creates printable invoice HTML with escaped customer content and totals', () => {
  const html = createPrintableDocumentHtml({
    type: 'invoice',
    number: '2026-0143',
    status: 'Concept',
    companyName: 'NOVA Demo BV',
    companyVat: 'NL862145901B01',
    companyChamber: '87124490',
    customerName: '<Studio Veldkamp>',
    customerAddress: 'Keizersgracht 214',
    date: '2026-07-03',
    dueDate: '2026-07-17',
    lines: [{ description: 'Advies', quantity: 2, price: 100, vat: 21 }],
  })

  assert.match(html, /Factuur 2026-0143/)
  assert.match(html, /&lt;Studio Veldkamp&gt;/)
  assert.match(html, /€\s*242,00/)
})

test('creates printable quote HTML with validity date', () => {
  const html = createPrintableDocumentHtml({
    type: 'quote',
    number: 'OFF-2026-056',
    status: 'Verzonden',
    companyName: 'NOVA Demo BV',
    companyVat: 'NL862145901B01',
    companyChamber: '87124490',
    customerName: 'Rijnhaven Logistics',
    customerAddress: 'Rotterdam',
    date: '2026-07-03',
    validUntil: '2026-07-24',
    lines: [{ description: 'Voorstel', quantity: 1, price: 500, vat: 9 }],
  })

  assert.match(html, /Offerte OFF-2026-056/)
  assert.match(html, /Geldig tot: 2026-07-24/)
  assert.match(html, /€\s*545,00/)
})
