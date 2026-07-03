import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sendDocumentEmail } from '../src/services/documentSendService.ts'

const document = {
  type: 'invoice' as const,
  number: '2026-0143',
  status: 'Concept',
  companyName: 'Muldersign',
  companyVat: 'NL004592528B88',
  companyChamber: '88373630',
  customerName: 'Studio Veldkamp',
  customerAddress: 'Amsterdam',
  date: '2026-07-04',
  dueDate: '2026-07-18',
  lines: [{ description: 'Advies', quantity: 1, price: 100, vat: 21 }],
  title: 'Factuur 2026-0143',
  total: '€ 121,00',
}

test('send document service posts customer email with PDF payload', async () => {
  const originalFetch = globalThis.fetch
  let requestBody = ''

  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body ?? '')
    return new Response(JSON.stringify({ message: 'Document is verstuurd.' }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const message = await sendDocumentEmail({
      to: 'klant@example.nl',
      from: 'send@brenqo.nl',
      replyTo: 'administratie@muldersign.nl',
      subject: 'Factuur 2026-0143',
      body: 'Beste klant',
      filename: 'factuur-2026-0143.pdf',
      document,
    })

    const payload = JSON.parse(requestBody)
    assert.equal(message, 'Document is verstuurd.')
    assert.equal(payload.to, 'klant@example.nl')
    assert.equal(payload.document.number, '2026-0143')
    assert.equal(payload.filename, 'factuur-2026-0143.pdf')
  } finally {
    globalThis.fetch = originalFetch
  }
})
