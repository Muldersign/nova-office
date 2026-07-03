import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readSupabaseConfig } from '../src/services/supabaseConfig.ts'

test('supabase config stays disabled until public env vars are present', () => {
  assert.deepEqual(readSupabaseConfig({}), { enabled: false, url: '', anonKey: '' })
})

test('supabase config enables with url and anon key', () => {
  assert.deepEqual(readSupabaseConfig({
    VITE_SUPABASE_URL: 'https://project.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'anon',
  }), {
    enabled: true,
    url: 'https://project.supabase.co',
    anonKey: 'anon',
  })
})
