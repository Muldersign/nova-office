export type FoundationTable =
  | 'users'
  | 'companies'
  | 'company_memberships'
  | 'roles'
  | 'customers'
  | 'invoices'
  | 'invoice_items'
  | 'quotes'
  | 'quote_items'
  | 'audit_events'

export const tenantScopedTables: FoundationTable[] = [
  'company_memberships',
  'customers',
  'invoices',
  'invoice_items',
  'quotes',
  'quote_items',
  'audit_events',
]

export const foundationSchema = {
  users: ['id', 'name', 'email', 'password_hash', 'created_at'],
  companies: ['id', 'name', 'kvk_number', 'vat_number', 'created_at'],
  company_memberships: ['id', 'user_id', 'company_id', 'role_id', 'status'],
  roles: ['id', 'company_id', 'name', 'permissions'],
  customers: ['id', 'company_id', 'company_name', 'contact_name', 'email', 'phone', 'address', 'vat_number', 'chamber_number'],
  invoices: ['id', 'company_id', 'customer_id', 'number', 'status', 'invoice_date', 'due_date', 'subtotal', 'vat_total', 'total'],
  invoice_items: ['id', 'company_id', 'invoice_id', 'description', 'quantity', 'unit_price', 'vat_rate', 'line_total'],
  quotes: ['id', 'company_id', 'customer_id', 'number', 'status', 'valid_until', 'subtotal', 'vat_total', 'total'],
  quote_items: ['id', 'company_id', 'quote_id', 'description', 'quantity', 'unit_price', 'vat_rate', 'line_total'],
  audit_events: ['id', 'company_id', 'user_id', 'action', 'entity_type', 'entity_id', 'created_at'],
} satisfies Record<FoundationTable, string[]>

export const foundationRules = [
  'Every tenant-scoped query must include company_id.',
  'A user accesses company data only through company_memberships.',
  'Roles are resolved per company, never globally.',
  'Invoice and quote numbers are unique per company.',
  'Audit events are append-only.',
]
