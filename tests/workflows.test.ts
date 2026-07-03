import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createInviteEmail, createInviteLink, createInviteToken, safeDocumentFilename } from '../src/foundation/workflows.ts'

test('creates stable invite links and email copy', () => {
  const token = createInviteToken('Finance@Brenqo.nl', 'company-1', 123)
  const link = createInviteLink('https://brenqo.nl/', token)
  const email = createInviteEmail({
    companyName: 'Brenqo',
    inviterName: 'Glenn',
    inviteeName: 'Sam',
    inviteeEmail: 'sam@example.nl',
    role: 'Financieel medewerker',
    token,
    origin: 'https://brenqo.nl/',
  })

  assert.equal(link, email.link)
  assert.match(email.subject, /Brenqo/)
  assert.match(email.body, /Financieel medewerker/)
  assert.match(email.link, /^https:\/\/brenqo\.nl\/\?invite=/)
})

test('creates safe document filenames', () => {
  assert.equal(safeDocumentFilename('factuur', '2026/0143'), 'factuur-2026-0143.html')
  assert.equal(safeDocumentFilename('offerte', 'OFF 2026 056', 'pdf'), 'offerte-off-2026-056.pdf')
})
