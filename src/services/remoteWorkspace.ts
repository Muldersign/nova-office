import type { SupabaseClient } from '@supabase/supabase-js'

export type RemoteWorkspace = {
  companies: Array<Record<string, unknown>>
  companySettings: Array<Record<string, unknown>>
  teamMembers: Array<Record<string, unknown>>
  products: Array<Record<string, unknown>>
  customers: Array<Record<string, unknown>>
  invoices: Array<Record<string, unknown>>
  quotes: Array<Record<string, unknown>>
  auditEvents: Array<Record<string, unknown>>
}

type LineItem = {
  description: string
  quantity: number
  price: number
  vat: number
}

type DocumentRecord = Record<string, unknown> & {
  id: string
  companyId: string
  customerId: string
  number: string
  amount: number
  vat: number
  status: string
  date?: string
  due?: string
  validUntil?: string
  items: LineItem[]
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function loadRemoteWorkspace(client: SupabaseClient): Promise<RemoteWorkspace | null> {
  const [companies, settings, memberships, customers, products, invoices, quotes, auditEvents] = await Promise.all([
    client.from('companies').select('*').order('created_at', { ascending: true }),
    client.from('company_settings').select('*'),
    client.from('company_memberships').select('*'),
    client.from('customers').select('*').order('created_at', { ascending: false }),
    client.from('products').select('*').order('created_at', { ascending: false }),
    client.from('invoices').select('*, invoice_items(*)').order('created_at', { ascending: false }),
    client.from('quotes').select('*, quote_items(*)').order('created_at', { ascending: false }),
    client.from('audit_events').select('*').order('created_at', { ascending: false }).limit(50),
  ])

  if (companies.error || settings.error || memberships.error || customers.error || products.error || invoices.error || quotes.error || auditEvents.error) {
    return null
  }

  return {
    companies: companies.data.map(toCompany),
    companySettings: settings.data.map(toCompanySettings),
    teamMembers: memberships.data.map(toTeamMember),
    products: products.data.map(toProduct),
    customers: customers.data.map(toCustomer),
    invoices: invoices.data.map(toInvoice),
    quotes: quotes.data.map(toQuote),
    auditEvents: auditEvents.data.map(toAuditEvent),
  }
}

export async function upsertRemoteCustomer(client: SupabaseClient, customer: Record<string, unknown>) {
  if (!isUuid(String(customer.id)) || !isUuid(String(customer.companyId))) return
  const { error } = await client.from('customers').upsert({
    id: customer.id,
    company_id: customer.companyId,
    company_name: customer.name,
    contact_name: customer.contact,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    postal_code: customer.postalCode,
    city: customer.city,
    vat_number: customer.vat,
    chamber_number: customer.chamber,
    revenue: customer.revenue,
    updated_at: new Date().toISOString(),
  })
  throwIfRemoteError(error)
}

export async function upsertRemoteProduct(client: SupabaseClient, product: Record<string, unknown>) {
  if (!isUuid(String(product.id)) || !isUuid(String(product.companyId))) return
  const { error } = await client.from('products').upsert({
    id: product.id,
    company_id: product.companyId,
    name: product.name,
    description: product.description,
    unit_price: product.unitPrice,
    vat_rate: product.vat,
    category: product.category,
    updated_at: new Date().toISOString(),
  })
  throwIfRemoteError(error)
}

export async function upsertRemoteCompany(client: SupabaseClient, company: Record<string, unknown>) {
  if (!isUuid(String(company.id))) return
  const rpc = await client.rpc('save_company_workspace', {
    target_company_id: company.id,
    company_name: company.name,
    kvk_number: company.chamber,
    vat_number: company.vat,
    company_address: company.address,
    company_postal_code: company.postalCode,
    company_city: company.city,
    company_phone: company.phone,
    company_email: company.email,
    company_iban: company.iban,
    company_bic: company.bic,
    company_logo_url: company.logoUrl,
    company_plan: company.plan,
  })
  if (!rpc.error) return

  const { error } = await client.from('companies').upsert({
    id: company.id,
    name: company.name,
    kvk_number: company.chamber,
    vat_number: company.vat,
    address: company.address,
    postal_code: company.postalCode,
    city: company.city,
    phone: company.phone,
    email: company.email,
    iban: company.iban,
    bic: company.bic,
    logo_url: company.logoUrl,
    plan: company.plan,
  })
  throwIfRemoteError(error ?? rpc.error)
}

export async function upsertRemoteSettings(client: SupabaseClient, settings: Record<string, unknown>) {
  if (!isUuid(String(settings.companyId))) return
  const { error } = await client.from('company_settings').upsert({
    company_id: settings.companyId,
    default_vat_rate: settings.defaultVat,
    payment_term_days: settings.paymentTermDays,
    invoice_prefix: settings.invoicePrefix,
    quote_prefix: settings.quotePrefix,
    payment_reference_prefix: settings.paymentReferencePrefix,
    document_footer: settings.documentFooter,
    updated_at: new Date().toISOString(),
  })
  throwIfRemoteError(error)
}

export async function upsertRemoteInvoice(client: SupabaseClient, invoice: DocumentRecord) {
  if (!isUuid(invoice.id) || !isUuid(invoice.companyId) || !isUuid(invoice.customerId)) return
  const { error } = await client.from('invoices').upsert({
    id: invoice.id,
    company_id: invoice.companyId,
    customer_id: invoice.customerId,
    number: invoice.number,
    status: invoice.status,
    invoice_date: invoice.date,
    due_date: invoice.due,
    subtotal: Number(invoice.amount) - Number(invoice.vat),
    vat_total: invoice.vat,
    total: invoice.amount,
    updated_at: new Date().toISOString(),
  })
  throwIfRemoteError(error)
  await replaceLineItems(client, 'invoice_items', invoice.id, invoice.companyId, invoice.items)
}

export async function upsertRemoteQuote(client: SupabaseClient, quote: DocumentRecord) {
  if (!isUuid(quote.id) || !isUuid(quote.companyId) || !isUuid(quote.customerId)) return
  const { error } = await client.from('quotes').upsert({
    id: quote.id,
    company_id: quote.companyId,
    customer_id: quote.customerId,
    number: quote.number,
    status: quote.status,
    valid_until: quote.validUntil,
    subtotal: Number(quote.amount) - Number(quote.vat),
    vat_total: quote.vat,
    total: quote.amount,
    updated_at: new Date().toISOString(),
  })
  throwIfRemoteError(error)
  await replaceLineItems(client, 'quote_items', quote.id, quote.companyId, quote.items)
}

export async function deleteRemoteRecord(client: SupabaseClient, table: string, id: string) {
  if (!isUuid(id)) return
  const { error } = await client.from(table).delete().eq('id', id)
  throwIfRemoteError(error)
}

async function replaceLineItems(client: SupabaseClient, table: 'invoice_items' | 'quote_items', parentId: string, companyId: string, items: LineItem[]) {
  const deleted = await client.from(table).delete().eq('parent_id', parentId)
  throwIfRemoteError(deleted.error)
  if (!items.length) return
  const inserted = await client.from(table).insert(items.map((item) => ({
    company_id: companyId,
    parent_id: parentId,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.price,
    vat_rate: item.vat,
  })))
  throwIfRemoteError(inserted.error)
}

function throwIfRemoteError(error: { message?: string } | null) {
  if (error) {
    throw new Error(error.message ?? 'Supabase actie is mislukt.')
  }
}

function toCompany(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    role: 'Eigenaar',
    plan: row.plan,
    chamber: row.kvk_number,
    vat: row.vat_number,
    address: row.address,
    postalCode: row.postal_code,
    city: row.city,
    phone: row.phone,
    email: row.email,
    iban: row.iban,
    bic: row.bic,
    logoUrl: row.logo_url,
  }
}

function toCompanySettings(row: Record<string, unknown>) {
  return {
    companyId: row.company_id,
    defaultVat: row.default_vat_rate,
    paymentTermDays: row.payment_term_days,
    invoicePrefix: row.invoice_prefix,
    quotePrefix: row.quote_prefix,
    paymentReferencePrefix: row.payment_reference_prefix ?? 'Factuur',
    documentFooter: row.document_footer ?? 'Bedankt voor de samenwerking. Vragen? Reageer op deze factuurmail.',
  }
}

function toTeamMember(row: Record<string, unknown>) {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.user_id,
    email: '',
    role: row.role,
    status: row.status,
  }
}

function toCustomer(row: Record<string, unknown>) {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.company_name,
    contact: row.contact_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    postalCode: row.postal_code,
    city: row.city,
    vat: row.vat_number,
    chamber: row.chamber_number,
    revenue: row.revenue,
  }
}

function toProduct(row: Record<string, unknown>) {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description,
    unitPrice: row.unit_price,
    vat: row.vat_rate,
    category: row.category,
  }
}

function toInvoice(row: Record<string, unknown>) {
  return {
    id: row.id,
    companyId: row.company_id,
    customerId: row.customer_id,
    number: row.number,
    date: row.invoice_date,
    due: row.due_date,
    amount: row.total,
    vat: row.vat_total,
    status: row.status,
    items: mapLineItems(row.invoice_items),
  }
}

function toQuote(row: Record<string, unknown>) {
  return {
    id: row.id,
    companyId: row.company_id,
    customerId: row.customer_id,
    number: row.number,
    amount: row.total,
    vat: row.vat_total,
    status: row.status,
    validUntil: row.valid_until,
    items: mapLineItems(row.quote_items),
  }
}

function toAuditEvent(row: Record<string, unknown>) {
  return {
    id: row.id,
    companyId: row.company_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    createdAt: row.created_at,
  }
}

function mapLineItems(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      price: item.unit_price,
      vat: item.vat_rate,
    }))
    : []
}
