import assert from 'node:assert/strict'
import { test } from 'node:test'
import { publicAuthRedirectUrl, submitAuth, updatePassword, validateAuthInput, validatePasswordStrength } from '../src/services/authService.ts'

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

test('auth validation requires a stronger password', () => {
  assert.deepEqual(validatePasswordStrength('alleenletters'), {
    ok: false,
    message: 'Gebruik minimaal een letter en een cijfer in je wachtwoord.',
  })

  assert.deepEqual(validatePasswordStrength('veilig123', 'anders123'), {
    ok: false,
    message: 'De wachtwoorden zijn niet gelijk.',
  })
})

test('auth validation accepts forgot password without password', () => {
  assert.equal(validateAuthInput('forgot', 'info@brenqo.nl', '').ok, true)
})

test('public auth redirect never falls back to localhost', () => {
  assert.equal(publicAuthRedirectUrl({ VITE_APP_DOMAIN: 'https://brenqo.nl/' }), 'https://brenqo.nl/')
  assert.equal(publicAuthRedirectUrl({}), 'https://brenqo.nl/')
})

test('forgot password sends users back to Brenqo reset screen', async () => {
  let redirectTo = ''
  const result = await submitAuth({
    auth: {
      resetPasswordForEmail: async (_email: string, options: { redirectTo: string }) => {
        redirectTo = options.redirectTo
        return { error: null }
      },
    },
  } as never, 'forgot', {
    email: 'test@brenqo.nl',
    password: '',
    name: '',
    companyName: '',
    redirectTo: 'https://brenqo.nl/',
  })

  assert.equal(result.ok, true)
  assert.equal(redirectTo, 'https://brenqo.nl/?reset=1')
})

test('registration without session asks for email confirmation without opening app', async () => {
  const result = await submitAuth({
    auth: {
      signUp: async () => ({ data: { session: null }, error: null }),
    },
  } as never, 'register', {
    email: 'test@brenqo.nl',
    password: 'veilig-wachtwoord1',
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
    password: 'veilig-wachtwoord1',
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
    password: 'veilig-wachtwoord1',
    name: 'Team Gebruiker',
    companyName: 'Wordt genegeerd',
    redirectTo: 'https://brenqo.nl/',
    inviteToken: 'invite-token',
  })

  assert.equal(result.ok, true)
  assert.equal(result.openApp, true)
  assert.deepEqual(calls, ['accept_company_invite'])
})

test('password update validates length and calls Supabase', async () => {
  assert.equal((await updatePassword(null, 'kort')).ok, false)

  const calls: string[] = []
  const result = await updatePassword({
    auth: {
      updateUser: async (input: { password: string }) => {
        calls.push(input.password)
        return { error: null }
      },
    },
  } as never, 'nieuw-wachtwoord1')

  assert.equal(result.ok, true)
  assert.deepEqual(calls, ['nieuw-wachtwoord1'])
})
