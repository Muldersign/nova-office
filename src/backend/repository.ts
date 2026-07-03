import { assertCan } from './auth.ts'
import type {
  AuditEventRecord,
  CustomerRecord,
  DocumentLineRecord,
  InvoiceRecord,
  NovaDatabase,
  QuoteRecord,
} from './schema.ts'

type RequestContext = {
  userId: string
  companyId: string
}

function now() {
  return new Date().toISOString()
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function listCustomers(database: NovaDatabase, context: RequestContext) {
  assertCan(database, context.userId, context.companyId, 'read')
  return database.customers.filter((customer) => customer.companyId === context.companyId)
}

export function createCustomer(
  database: NovaDatabase,
  context: RequestContext,
  input: Omit<CustomerRecord, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
) {
  assertCan(database, context.userId, context.companyId, 'create')

  const record: CustomerRecord = {
    ...input,
    id: id('cus'),
    companyId: context.companyId,
    createdAt: now(),
    updatedAt: now(),
  }

  database.customers.unshift(record)
  appendAudit(database, context, `Klant toegevoegd: ${record.companyName}`, 'customer', record.id)
  return record
}

export function updateCustomer(
  database: NovaDatabase,
  context: RequestContext,
  customerId: string,
  input: Omit<CustomerRecord, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
) {
  assertCan(database, context.userId, context.companyId, 'update')
  const customer = database.customers.find((record) => record.id === customerId && record.companyId === context.companyId)

  if (!customer) {
    throw new Error('NOT_FOUND')
  }

  Object.assign(customer, input, { updatedAt: now() })
  appendAudit(database, context, `Klant bijgewerkt: ${customer.companyName}`, 'customer', customer.id)
  return customer
}

export function listInvoices(database: NovaDatabase, context: RequestContext) {
  assertCan(database, context.userId, context.companyId, 'read')
  return database.invoices.filter((invoice) => invoice.companyId === context.companyId)
}

export function createInvoice(
  database: NovaDatabase,
  context: RequestContext,
  input: Omit<InvoiceRecord, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
  items: Array<Omit<DocumentLineRecord, 'id' | 'companyId' | 'parentId'>>,
) {
  assertCan(database, context.userId, context.companyId, 'create')

  const record: InvoiceRecord = {
    ...input,
    id: id('inv'),
    companyId: context.companyId,
    createdAt: now(),
    updatedAt: now(),
  }

  database.invoices.unshift(record)
  database.invoiceItems.unshift(...items.map((item) => ({
    ...item,
    id: id('ili'),
    companyId: context.companyId,
    parentId: record.id,
  })))
  appendAudit(database, context, `Factuur ${record.number} aangemaakt`, 'invoice', record.id)
  return record
}

export function updateInvoice(
  database: NovaDatabase,
  context: RequestContext,
  invoiceId: string,
  input: Omit<InvoiceRecord, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
  items: Array<Omit<DocumentLineRecord, 'id' | 'companyId' | 'parentId'>>,
) {
  assertCan(database, context.userId, context.companyId, 'update')
  const invoice = database.invoices.find((record) => record.id === invoiceId && record.companyId === context.companyId)

  if (!invoice) {
    throw new Error('NOT_FOUND')
  }

  Object.assign(invoice, input, { updatedAt: now() })
  database.invoiceItems = database.invoiceItems.filter((item) => item.parentId !== invoice.id || item.companyId !== context.companyId)
  database.invoiceItems.unshift(...items.map((item) => ({
    ...item,
    id: id('ili'),
    companyId: context.companyId,
    parentId: invoice.id,
  })))
  appendAudit(database, context, `Factuur ${invoice.number} bijgewerkt`, 'invoice', invoice.id)
  return invoice
}

export function deleteInvoice(database: NovaDatabase, context: RequestContext, invoiceId: string) {
  assertCan(database, context.userId, context.companyId, 'delete')
  const invoice = database.invoices.find((record) => record.id === invoiceId && record.companyId === context.companyId)

  if (!invoice) {
    throw new Error('NOT_FOUND')
  }

  database.invoices = database.invoices.filter((record) => record.id !== invoiceId)
  database.invoiceItems = database.invoiceItems.filter((item) => item.parentId !== invoiceId)
  appendAudit(database, context, `Factuur ${invoice.number} verwijderd`, 'invoice', invoice.id)
  return invoice
}

export function updateInvoiceStatus(
  database: NovaDatabase,
  context: RequestContext,
  invoiceId: string,
  status: InvoiceRecord['status'],
) {
  assertCan(database, context.userId, context.companyId, 'update')
  const invoice = database.invoices.find(
    (record) => record.id === invoiceId && record.companyId === context.companyId,
  )

  if (!invoice) {
    throw new Error('NOT_FOUND')
  }

  invoice.status = status
  invoice.updatedAt = now()
  appendAudit(database, context, `Factuur ${invoice.number} gemarkeerd als ${status}`, 'invoice', invoice.id)
  return invoice
}

export function listQuotes(database: NovaDatabase, context: RequestContext) {
  assertCan(database, context.userId, context.companyId, 'read')
  return database.quotes.filter((quote) => quote.companyId === context.companyId)
}

export function createQuote(
  database: NovaDatabase,
  context: RequestContext,
  input: Omit<QuoteRecord, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
  items: Array<Omit<DocumentLineRecord, 'id' | 'companyId' | 'parentId'>>,
) {
  assertCan(database, context.userId, context.companyId, 'create')

  const record: QuoteRecord = {
    ...input,
    id: id('quo'),
    companyId: context.companyId,
    createdAt: now(),
    updatedAt: now(),
  }

  database.quotes.unshift(record)
  database.quoteItems.unshift(...items.map((item) => ({
    ...item,
    id: id('qli'),
    companyId: context.companyId,
    parentId: record.id,
  })))
  appendAudit(database, context, `Offerte ${record.number} aangemaakt`, 'quote', record.id)
  return record
}

export function updateQuote(
  database: NovaDatabase,
  context: RequestContext,
  quoteId: string,
  input: Omit<QuoteRecord, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
  items: Array<Omit<DocumentLineRecord, 'id' | 'companyId' | 'parentId'>>,
) {
  assertCan(database, context.userId, context.companyId, 'update')
  const quote = database.quotes.find((record) => record.id === quoteId && record.companyId === context.companyId)

  if (!quote) {
    throw new Error('NOT_FOUND')
  }

  Object.assign(quote, input, { updatedAt: now() })
  database.quoteItems = database.quoteItems.filter((item) => item.parentId !== quote.id || item.companyId !== context.companyId)
  database.quoteItems.unshift(...items.map((item) => ({
    ...item,
    id: id('qli'),
    companyId: context.companyId,
    parentId: quote.id,
  })))
  appendAudit(database, context, `Offerte ${quote.number} bijgewerkt`, 'quote', quote.id)
  return quote
}

export function deleteQuote(database: NovaDatabase, context: RequestContext, quoteId: string) {
  assertCan(database, context.userId, context.companyId, 'delete')
  const quote = database.quotes.find((record) => record.id === quoteId && record.companyId === context.companyId)

  if (!quote) {
    throw new Error('NOT_FOUND')
  }

  database.quotes = database.quotes.filter((record) => record.id !== quoteId)
  database.quoteItems = database.quoteItems.filter((item) => item.parentId !== quoteId)
  appendAudit(database, context, `Offerte ${quote.number} verwijderd`, 'quote', quote.id)
  return quote
}

export function appendAudit(
  database: NovaDatabase,
  context: RequestContext,
  action: string,
  entityType: AuditEventRecord['entityType'],
  entityId: string,
) {
  const event: AuditEventRecord = {
    id: id('evt'),
    companyId: context.companyId,
    userId: context.userId,
    action,
    entityType,
    entityId,
    createdAt: now(),
  }
  database.auditEvents.unshift(event)
  return event
}
