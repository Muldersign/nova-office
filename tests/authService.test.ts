import assert from 'node:assert/strict'
import { test } from 'node:test'
import { submitAuth, validateAuthInput } from '../src/services/authService.ts'

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

test('registration without session asks for email confirmation without opening app', async () => {
  const result = await submitAuth({
    auth: {
      signUp: async () => ({ data: { session: null }, error: null }),
    },
  } as never, 'register', {
    email: 'test@brenqo.nl',
    password: 'veilig-wachtwoord',
    name: 'Test Gebruiker',
    companyName: 'Testbedrijf',
    redirectTo: 'https://brenqo.nl/',
  })

  assert.equal(result.ok, true)
  assert.equal(result.openApp, undefined)
  assert.match(result.message, /Bevestig je e-mailadres/)
})

test('registration with session opens app after workspace bootstrap', async () => {
  const calls: string[] = []
  const result = await submitAuth({
    auth: {
      signUp: async () => ({ data: { session: { access_token: 'token' } }, error: null }),
    },
    rpc: async (name: string) => {
      calls.push(name)
      return { error: null }
    },
  } as never, 'register', {
    email: 'test@brenqo.nl',
    password: 'veilig-wachtwoord',
    name: 'Test Gebruiker',
    companyName: 'Testbedrijf',
    redirectTo: 'https://brenqo.nl/',
  })

  assert.equal(result.ok, true)
  assert.equal(result.openApp, true)
  assert.deepEqual(calls, ['bootstrap_workspace'])
})

test('registration with invite accepts invite instead of creating workspace', async () => {
  const calls: string[] = []
  const result = await submitAuth({
    auth: {
      signUp: async () => ({ data: { session: { access_token: 'token' } }, error: null }),
    },
    rpc: async (name: string) => {
      calls.push(name)
      return { error: null }
    },
  } as never, 'register', {
    email: 'team@brenqo.nl',
    password: 'veilig-wachtwoord',
    name: 'Team Gebruiker',
    companyName: 'Wordt genegeerd',
    redirectTo: 'https://brenqo.nl/',
    inviteToken: 'invite-token',
  })

  assert.equal(result.ok, true)
  assert.equal(result.openApp, true)
  assert.deepEqual(calls, ['accept_company_invite'])
})
