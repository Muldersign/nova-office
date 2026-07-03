import assert from 'node:assert/strict'
import { test } from 'node:test'
import { api } from '../src/backend/api.ts'
import { can, findMembership } from '../src/backend/auth.ts'
import { createCustomer, createInvoice, deleteInvoice, listCustomers, updateInvoice } from '../src/backend/repository.ts'
import { emptyDatabase, type NovaDatabase } from '../src/backend/schema.ts'
import { loginUser, registerUser } from '../src/backend/session.ts'

function seededDatabase(): NovaDatabase {
  const database = emptyDatabase()
  database.users.push({
    id: 'usr_owner',
    name: 'Owner',
    email: 'owner@nova.test',
    passwordHash: 'hash',
    createdAt: '2026-07-03T00:00:00.000Z',
  })
  database.companies.push(
    {
      id: 'comp_a',
      name: 'Company A',
      kvkNumber: '100',
      vatNumber: 'NL100',
      plan: 'NOVA Start',
      createdAt: '2026-07-03T00:00:00.000Z',
    },
    {
      id: 'comp_b',
      name: 'Company B',
      kvkNumber: '200',
      vatNumber: 'NL200',
      plan: 'NOVA Start',
      createdAt: '2026-07-03T00:00:00.000Z',
    },
  )
  database.memberships.push({
    id: 'mem_a',
    userId: 'usr_owner',
    companyId: 'comp_a',
    role: 'owner',
    status: 'active',
  })
  database.customers.push({
    id: 'cus_b',
    companyId: 'comp_b',
    companyName: 'Hidden BV',
    contactName: 'Hidden',
    email: 'hidden@nova.test',
    phone: '000',
    address: 'Hidden 1',
    postalCode: '0000 AA',
    city: 'Nowhere',
    vatNumber: 'NL000',
    chamberNumber: '000',
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z',
  })
  return database
}

test('backend repository never leaks customers across companies', () => {
  const database = seededDatabase()
  const created = createCustomer(database, { userId: 'usr_owner', companyId: 'comp_a' }, {
    companyName: 'Visible BV',
    contactName: 'Visible',
    email: 'visible@nova.test',
    phone: '123',
    address: 'Main 1',
    postalCode: '9711 AA',
    city: 'Groningen',
    vatNumber: 'NL123',
    chamberNumber: '123',
  })

  const results = listCustomers(database, { userId: 'usr_owner', companyId: 'comp_a' })
  assert.deepEqual(results.map((customer) => customer.id), [created.id])
})

test('backend permissions deny access without active membership', () => {
  const database = seededDatabase()
  const result = api.customers.list(database, { userId: 'usr_owner', companyId: 'comp_b' })

  assert.equal(result.ok, false)
  assert.equal(result.status, 403)
})

test('backend role permissions allow owner management', () => {
  const database = seededDatabase()
  const membership = findMembership(database, 'usr_owner', 'comp_a')

  assert.equal(can(membership, 'manage_settings'), true)
  assert.equal(can(membership, 'delete'), true)
})

test('backend API writes audit events for customer creation', () => {
  const database = seededDatabase()
  const result = api.customers.create(database, { userId: 'usr_owner', companyId: 'comp_a' }, {
    companyName: 'Audit BV',
    contactName: 'Audrey',
    email: 'audit@nova.test',
    phone: '123',
    address: 'Log 1',
    postalCode: '9711 AB',
    city: 'Groningen',
    vatNumber: 'NL321',
    chamberNumber: '321',
  })

  assert.equal(result.ok, true)
  assert.equal(database.auditEvents.length, 1)
  assert.equal(database.auditEvents[0].companyId, 'comp_a')
})

test('auth registration creates user, company, membership and session', () => {
  const database = emptyDatabase()
  const session = registerUser(database, {
    name: 'Glen',
    email: 'glen@nova.test',
    password: 'novapass2026',
    companyName: 'NOVA BV',
    kvkNumber: '123',
    vatNumber: 'NL123',
  })

  assert.equal(database.users.length, 1)
  assert.equal(database.companies.length, 1)
  assert.equal(database.memberships[0].role, 'owner')
  assert.equal(loginUser(database, 'glen@nova.test', 'novapass2026').activeCompanyId, session.activeCompanyId)
})

test('backend updates and deletes invoice lines inside tenant scope', () => {
  const database = seededDatabase()
  database.customers.push({
    id: 'cus_a',
    companyId: 'comp_a',
    companyName: 'Visible BV',
    contactName: 'Visible',
    email: 'visible@nova.test',
    phone: '123',
    address: 'Main 1',
    postalCode: '9711 AA',
    city: 'Groningen',
    vatNumber: 'NL123',
    chamberNumber: '123',
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z',
  })

  const context = { userId: 'usr_owner', companyId: 'comp_a' }
  const invoice = createInvoice(database, context, {
    customerId: 'cus_a',
    number: '2026-0001',
    status: 'draft',
    invoiceDate: '2026-07-03',
    dueDate: '2026-07-17',
    subtotal: 100,
    vatTotal: 21,
    total: 121,
  }, [{ description: 'Advies', quantity: 1, unitPrice: 100, vatRate: 21 }])

  updateInvoice(database, context, invoice.id, {
    customerId: 'cus_a',
    number: '2026-0001',
    status: 'sent',
    invoiceDate: '2026-07-03',
    dueDate: '2026-07-17',
    subtotal: 200,
    vatTotal: 42,
    total: 242,
  }, [{ description: 'Advies bijgewerkt', quantity: 2, unitPrice: 100, vatRate: 21 }])

  assert.equal(database.invoiceItems.filter((item) => item.parentId === invoice.id).length, 1)
  assert.equal(database.invoices[0].status, 'sent')
  deleteInvoice(database, context, invoice.id)
  assert.equal(database.invoices.length, 0)
  assert.equal(database.invoiceItems.length, 0)
})
