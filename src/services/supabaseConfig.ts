export type SupabaseConfig = {
  enabled: boolean
  url: string
  anonKey: string
}

export function readSupabaseConfig(env: Record<string, string | undefined> = import.meta.env) {
  const url = env.VITE_SUPABASE_URL ?? ''
  const anonKey = env.VITE_SUPABASE_ANON_KEY ?? ''

  return {
    enabled: Boolean(url && anonKey),
    url,
    anonKey,
  } satisfies SupabaseConfig
}
