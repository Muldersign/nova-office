import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateAuthInput } from '../src/services/authService.ts'

test('auth validation rejects invalid email', () => {
  assert.deepEqual(validateAuthInput('login', 'geen-email', 'wachtwoord'), {
    ok: false,
    message: 'Vul een geldig e-mailadres in.',
  })
})

test('auth validation enforces password length', () => {
  assert.deepEqual(validateAuthInput('register', 'info@brenqo.nl', 'kort', 'Glen', 'Brenqo'), {
    ok: false,
    message: 'Gebruik minimaal 8 tekens voor je wachtwoord.',
  })
})

test('auth validation accepts forgot password without password', () => {
  assert.equal(validateAuthInput('forgot', 'info@brenqo.nl', '').ok, true)
})
