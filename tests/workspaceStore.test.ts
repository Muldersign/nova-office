import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRemoteWorkspaceEndpoint, createWorkspaceStore } from '../src/services/workspaceStore.ts'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}

test('workspace store reads only matching versions', () => {
  const storage = memoryStorage()
  const store = createWorkspaceStore(storage, 'version', 'v1')
  store.write('customers', [{ id: 'cus_1' }])

  assert.deepEqual(store.read('customers', []), [{ id: 'cus_1' }])
  assert.deepEqual(createWorkspaceStore(storage, 'version', 'v2').read('customers', []), [])
})

test('workspace store falls back on invalid JSON', () => {
  const storage = memoryStorage()
  storage.setItem('version', 'v1')
  storage.setItem('broken', '{')

  assert.deepEqual(createWorkspaceStore(storage, 'version', 'v1').read('broken', ['fallback']), ['fallback'])
})

test('remote endpoint builder keeps module routes explicit', () => {
  const endpoint = createRemoteWorkspaceEndpoint('/api/workspace')

  assert.equal(endpoint.products, '/api/workspace/products')
  assert.equal(endpoint.team, '/api/workspace/team')
})
