export type RoleName = 'owner' | 'admin' | 'member' | 'viewer'

export type DocumentStatus = 'draft' | 'sent' | 'paid' | 'overdue'

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined'

export type UserRecord = {
  id: string
  name: string
  email: string
  passwordHash: string
  createdAt: string
}

export type CompanyRecord = {
  id: string
  name: string
  kvkNumber: string
  vatNumber: string
  plan: 'NOVA Start' | 'NOVA ZZP' | 'NOVA MKB' | 'NOVA Enterprise'
  createdAt: string
}

export type MembershipRecord = {
  id: string
  userId: string
  companyId: string
  role: RoleName
  status: 'active' | 'invited' | 'disabled'
}

export type CompanySettingsRecord = {
  companyId: string
  defaultVatRate: number
  paymentTermDays: number
  invoicePrefix: string
  quotePrefix: string
  updatedAt: string
}

export type CustomerRecord = {
  id: string
  companyId: string
  companyName: string
  contactName: string
  email: string
  phone: string
  address: string
  postalCode: string
  city: string
  vatNumber: string
  chamberNumber: string
  createdAt: string
  updatedAt: string
}

export type DocumentLineRecord = {
  id: string
  companyId: string
  parentId: string
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}

export type InvoiceRecord = {
  id: string
  companyId: string
  customerId: string
  number: string
  status: DocumentStatus
  invoiceDate: string
  dueDate: string
  subtotal: number
  vatTotal: number
  total: number
  createdAt: string
  updatedAt: string
}

export type QuoteRecord = {
  id: string
  companyId: string
  customerId: string
  number: string
  status: QuoteStatus
  validUntil: string
  subtotal: number
  vatTotal: number
  total: number
  createdAt: string
  updatedAt: string
}

export type AuditEventRecord = {
  id: string
  companyId: string
  userId: string
  action: string
  entityType: 'customer' | 'invoice' | 'quote' | 'company' | 'settings' | 'auth'
  entityId: string
  createdAt: string
}

export type NovaDatabase = {
  users: UserRecord[]
  companies: CompanyRecord[]
  memberships: MembershipRecord[]
  companySettings: CompanySettingsRecord[]
  customers: CustomerRecord[]
  invoices: InvoiceRecord[]
  invoiceItems: DocumentLineRecord[]
  quotes: QuoteRecord[]
  quoteItems: DocumentLineRecord[]
  auditEvents: AuditEventRecord[]
}

export const emptyDatabase = (): NovaDatabase => ({
  users: [],
  companies: [],
  memberships: [],
  companySettings: [],
  customers: [],
  invoices: [],
  invoiceItems: [],
  quotes: [],
  quoteItems: [],
  auditEvents: [],
})

export const tenantTables = [
  'memberships',
  'companySettings',
  'customers',
  'invoices',
  'invoiceItems',
  'quotes',
  'quoteItems',
  'auditEvents',
] as const
