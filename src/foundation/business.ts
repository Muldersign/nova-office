export type DocumentLine = {
  description: string
  quantity: number
  price: number
  vat: number
}

export type CompanyScoped = {
  companyId: string
}

export type RoleName = 'Eigenaar' | 'Beheerder' | 'Financieel medewerker' | 'Lezer'

export function calculateTotals(rows: DocumentLine[]) {
  return rows.reduce(
    (totals, row) => {
      const subtotal = row.quantity * row.price
      const vat = subtotal * (row.vat / 100)
      return {
        subtotal: totals.subtotal + subtotal,
        vatTotal: totals.vatTotal + vat,
        total: totals.total + subtotal + vat,
      }
    },
    { subtotal: 0, vatTotal: 0, total: 0 },
  )
}

export function nextDocumentNumber(existingNumbers: string[], prefix: string, width = 4) {
  const next = existingNumbers.reduce((highest, number) => {
    const current = Number(number.split('-').at(-1))
    return Number.isFinite(current) && current > highest ? current : highest
  }, 0) + 1

  return `${prefix}-${String(next).padStart(width, '0')}`
}

export function filterByCompany<T extends CompanyScoped>(records: T[], companyId: string) {
  return records.filter((record) => record.companyId === companyId)
}

export function canManage(role: RoleName, resource: 'customers' | 'invoices' | 'quotes' | 'settings') {
  if (role === 'Eigenaar') {
    return true
  }

  if (role === 'Beheerder') {
    return resource !== 'settings'
  }

  if (role === 'Financieel medewerker') {
    return resource === 'customers' || resource === 'invoices' || resource === 'quotes'
  }

  return false
}

export function validateRequiredCustomer(input: { name: string; email: string; city: string }) {
  return Boolean(input.name.trim() && input.email.includes('@') && input.city.trim())
}
