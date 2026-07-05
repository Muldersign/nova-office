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

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim())
}

export function isValidIban(iban: string) {
  const normalized = iban.replace(/\s+/g, '').toUpperCase()
  return normalized === '' || /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalized)
}

export function isValidDutchVatNumber(vat: string) {
  const normalized = vat.replace(/\s+/g, '').toUpperCase()
  return normalized === '' || /^NL\d{9}B\d{2}$/.test(normalized)
}

export function validateDocumentLines(rows: DocumentLine[]) {
  if (rows.length === 0) {
    return { ok: false, message: 'Voeg minimaal een regel toe.' }
  }

  const invalidRow = rows.find((row) => !row.description.trim() || row.quantity <= 0 || row.price < 0 || ![0, 9, 21].includes(Number(row.vat)))
  if (invalidRow) {
    return { ok: false, message: 'Controleer omschrijving, aantal, prijs en btw van alle regels.' }
  }

  return { ok: true, message: 'Documentregels zijn geldig.' }
}

export function validateRequiredCustomer(input: { name: string; email: string; city: string }) {
  return Boolean(input.name.trim() && isValidEmail(input.email) && input.city.trim())
}
