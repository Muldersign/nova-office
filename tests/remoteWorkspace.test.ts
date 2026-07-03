import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isUuid } from '../src/services/remoteWorkspace.ts'

test('remote workspace accepts real uuid identifiers', () => {
  assert.equal(isUuid('9ef1f404-7f8f-4e4a-a7ec-4fa1f6b9c6bb'), true)
})

test('remote workspace rejects legacy demo identifiers', () => {
  assert.equal(isUuid('cus_01'), false)
  assert.equal(isUuid('comp_muldersign'), false)
})
