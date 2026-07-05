import type { SupabaseClient } from '@supabase/supabase-js'
import { isValidEmail } from '../foundation/business.ts'

export type AuthMode = 'login' | 'register' | 'forgot'

export type AuthResult = {
  ok: boolean
  message: string
  openApp?: boolean
}

export function publicAuthRedirectUrl(env: Record<string, string | undefined> = import.meta.env) {
  const configuredDomain = env.VITE_APP_DOMAIN?.trim()
  const fallbackDomain = 'https://brenqo.nl'
  const baseUrl = configuredDomain || fallbackDomain
  return `${baseUrl.replace(/\/+$/, '')}/`
}

export function validateAuthInput(mode: AuthMode, email: string, password: string, name?: string, companyName?: string): AuthResult {
  if (!isValidEmail(email)) {
    return { ok: false, message: 'Vul een geldig e-mailadres in.' }
  }

  if (mode === 'forgot') {
    return { ok: true, message: 'Controleer je inbox voor de herstellink.' }
  }

  const passwordValidation = validatePasswordStrength(password)
  if (!passwordValidation.ok) {
    return passwordValidation
  }

  if (mode === 'register' && (!name?.trim() || !companyName?.trim())) {
    return { ok: false, message: 'Vul je naam en bedrijfsnaam in.' }
  }

  return { ok: true, message: 'Authenticatiegegevens zijn geldig.' }
}

export function validatePasswordStrength(password: string, confirmPassword = password): AuthResult {
  if (password.length < 8) {
    return { ok: false, message: 'Gebruik minimaal 8 tekens voor je wachtwoord.' }
  }

  if (!/[a-z]/i.test(password) || !/\d/.test(password)) {
    return { ok: false, message: 'Gebruik minimaal een letter en een cijfer in je wachtwoord.' }
  }

  if (password !== confirmPassword) {
    return { ok: false, message: 'De wachtwoorden zijn niet gelijk.' }
  }

  return { ok: true, message: 'Wachtwoord is sterk genoeg.' }
}

export async function submitAuth(
  client: SupabaseClient | null,
  mode: AuthMode,
  input: { email: string; password: string; name: string; companyName: string; redirectTo: string; inviteToken?: string },
) {
  const validation = validateAuthInput(mode, input.email, input.password, input.name, input.companyName)
  if (!validation.ok) {
    return validation
  }

  if (!client) {
    return { ok: true, message: 'Supabase staat lokaal uit; demo-sessie geopend.', openApp: true }
  }

  if (mode === 'forgot') {
    const resetUrl = new URL(input.redirectTo)
    resetUrl.searchParams.set('reset', '1')
    const { error } = await client.auth.resetPasswordForEmail(input.email, { redirectTo: resetUrl.toString() })
    return error ? { ok: false, message: error.message } : { ok: true, message: 'Controleer je inbox voor de herstellink.' }
  }

  if (mode === 'register') {
    const { data, error } = await client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          name: input.name,
          company_name: input.companyName,
        },
        emailRedirectTo: input.redirectTo,
      },
    })
    if (error) {
      return { ok: false, message: error.message }
    }

    if (data.session) {
      const bootstrap = input.inviteToken
        ? await acceptInviteWorkspace(client, input.inviteToken)
        : await bootstrapWorkspace(client, input.name, input.companyName)
      if (!bootstrap.ok) {
        return bootstrap
      }
      return { ok: true, message: input.inviteToken ? 'Account aangemaakt en uitnodiging geaccepteerd.' : 'Account aangemaakt en werkruimte geopend.', openApp: true }
    }

    return { ok: true, message: 'Account aangemaakt. Bevestig je e-mailadres voordat je inlogt.' }
  }

  const { error } = await client.auth.signInWithPassword({ email: input.email, password: input.password })
  if (error) {
    return { ok: false, message: error.message }
  }

  const bootstrap = input.inviteToken
    ? await acceptInviteWorkspace(client, input.inviteToken)
    : await bootstrapWorkspace(client, input.name, input.companyName)
  if (!bootstrap.ok) {
    return bootstrap
  }

  return { ok: true, message: input.inviteToken ? 'Je bent ingelogd en toegevoegd aan het bedrijf.' : 'Je bent ingelogd.', openApp: true }
}

export async function bootstrapWorkspace(client: SupabaseClient, name: string, companyName: string) {
  const { error } = await client.rpc('bootstrap_workspace', {
    profile_name: name,
    company_name: companyName,
  })

  if (error) {
    return { ok: false, message: `Supabase database is nog niet ingericht: ${error.message}` }
  }

  return { ok: true, message: 'Werkruimte is klaar.' }
}

export async function acceptInviteWorkspace(client: SupabaseClient, inviteToken: string) {
  const { error } = await client.rpc('accept_company_invite', {
    invite_token: inviteToken,
  })

  if (error) {
    return { ok: false, message: `Uitnodiging kon niet worden geaccepteerd: ${error.message}` }
  }

  return { ok: true, message: 'Uitnodiging geaccepteerd.' }
}

export async function updatePassword(client: SupabaseClient | null, password: string, confirmPassword = password) {
  const validation = validatePasswordStrength(password, confirmPassword)
  if (!validation.ok) {
    return validation
  }

  if (!client) {
    return { ok: true, message: 'Demo-modus: wachtwoord lokaal geaccepteerd.' }
  }

  const { error } = await client.auth.updateUser({ password })
  if (error) {
    return { ok: false, message: error.message }
  }

  return { ok: true, message: 'Je wachtwoord is bijgewerkt. Je kunt nu inloggen.' }
}
