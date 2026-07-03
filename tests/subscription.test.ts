import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isUsageWithinPlan, planByName, usagePercentage } from '../src/foundation/subscription.ts'

test('calculates subscription usage percentage safely', () => {
  assert.equal(usagePercentage(5, 10), 50)
  assert.equal(usagePercentage(25, 10), 100)
  assert.equal(usagePercentage(25, null), 0)
})

test('checks whether usage fits inside the selected plan', () => {
  const start = planByName('Brenqo Start')
  const enterprise = planByName('Brenqo Enterprise')

  assert.equal(isUsageWithinPlan({ companies: 1, customers: 10, invoices: 20, quotes: 5, teamMembers: 1 }, start), true)
  assert.equal(isUsageWithinPlan({ companies: 3, customers: 10, invoices: 20, quotes: 5, teamMembers: 1 }, start), false)
  assert.equal(isUsageWithinPlan({ companies: 100, customers: 10000, invoices: 20000, quotes: 1000, teamMembers: 100 }, enterprise), true)
})
