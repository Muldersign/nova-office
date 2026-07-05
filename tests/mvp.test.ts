import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  calculateTotals,
  canManage,
  filterByCompany,
  isValidDutchVatNumber,
  isValidEmail,
  isValidIban,
  nextDocumentNumber,
  validateDocumentLines,
  validateRequiredCustomer,
} from '../src/foundation/business.ts'

test('calculates subtotal, VAT and total for document lines', () => {
  const totals = calculateTotals([
    { description: 'Advies', quantity: 2, price: 100, vat: 21 },
    { description: 'Training', quantity: 1, price: 50, vat: 9 },
  ])

  assert.equal(totals.subtotal, 250)
  assert.equal(totals.vatTotal, 46.5)
  assert.equal(totals.total, 296.5)
})

test('generates the next invoice and quote number per prefix', () => {
  assert.equal(nextDocumentNumber(['2026-0141', '2026-0142'], '2026'), '2026-0143')
  assert.equal(nextDocumentNumber(['OFF-2026-054', 'OFF-2026-055'], 'OFF-2026', 3), 'OFF-2026-056')
})

test('filters records by company_id for tenant isolation', () => {
  const records = [
    { id: 'a', companyId: 'comp_a' },
    { id: 'b', companyId: 'comp_b' },
    { id: 'c', companyId: 'comp_a' },
  ]

  assert.deepEqual(filterByCompany(records, 'comp_a').map((record) => record.id), ['a', 'c'])
})

test('applies basic role based access rules', () => {
  assert.equal(canManage('Eigenaar', 'settings'), true)
  assert.equal(canManage('Beheerder', 'settings'), false)
  assert.equal(canManage('Financieel medewerker', 'invoices'), true)
  assert.equal(canManage('Lezer', 'customers'), false)
})

test('validates required customer fields', () => {
  assert.equal(validateRequiredCustomer({ name: 'Brenqo BV', email: 'finance@brenqo.nl', city: 'Amsterdam' }), true)
  assert.equal(validateRequiredCustomer({ name: '', email: 'finance-at-brenqo.nl', city: '' }), false)
})

test('validates production contact and tax fields', () => {
  assert.equal(isValidEmail('administratie@muldersign.nl'), true)
  assert.equal(isValidEmail('administratie@muldersign'), false)
  assert.equal(isValidDutchVatNumber('NL004592528B88'), true)
  assert.equal(isValidDutchVatNumber('NL123'), false)
  assert.equal(isValidIban('NL94 RABO 0338 4823 85'), true)
  assert.equal(isValidIban('RABO123'), false)
})

test('validates document lines before PDF or sending', () => {
  assert.equal(validateDocumentLines([{ description: 'Advies', quantity: 1, price: 100, vat: 21 }]).ok, true)
  assert.equal(validateDocumentLines([]).ok, false)
  assert.equal(validateDocumentLines([{ description: '', quantity: 0, price: -1, vat: 15 }]).ok, false)
})
