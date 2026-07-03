import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readSupabaseConfig } from './supabaseConfig'

let cachedClient: SupabaseClient | null | undefined

export function getSupabaseClient() {
  if (cachedClient !== undefined) {
    return cachedClient
  }

  const config = readSupabaseConfig()
  cachedClient = config.enabled
    ? createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
    : null

  return cachedClient
}

export function resetSupabaseClientForTests() {
  cachedClient = undefined
}
