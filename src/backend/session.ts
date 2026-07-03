import type { CompanyRecord, MembershipRecord, NovaDatabase, UserRecord } from './schema.ts'

type RegisterInput = {
  name: string
  email: string
  password: string
  companyName: string
  kvkNumber: string
  vatNumber: string
}

export type Session = {
  userId: string
  activeCompanyId: string
  token: string
}

export function registerUser(database: NovaDatabase, input: RegisterInput): Session {
  if (!input.email.includes('@') || input.password.length < 8 || !input.companyName.trim()) {
    throw new Error('VALIDATION_FAILED')
  }

  if (database.users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error('EMAIL_EXISTS')
  }

  const createdAt = now()
  const user: UserRecord = {
    id: id('usr'),
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash: hashPassword(input.password),
    createdAt,
  }
  const company: CompanyRecord = {
    id: id('comp'),
    name: input.companyName,
    kvkNumber: input.kvkNumber,
    vatNumber: input.vatNumber,
    address: '',
    postalCode: '',
    city: '',
    phone: '',
    email: user.email,
    iban: '',
    bic: '',
    logoUrl: '',
    plan: 'Brenqo Start',
    createdAt,
  }
  const membership: MembershipRecord = {
    id: id('mem'),
    userId: user.id,
    companyId: company.id,
    role: 'owner',
    status: 'active',
  }

  database.users.push(user)
  database.companies.push(company)
  database.memberships.push(membership)
  return createSession(user.id, company.id)
}

export function loginUser(database: NovaDatabase, email: string, password: string): Session {
  const user = database.users.find((record) => record.email.toLowerCase() === email.toLowerCase())
  if (!user || user.passwordHash !== hashPassword(password)) {
    throw new Error('INVALID_LOGIN')
  }

  const membership = database.memberships.find((record) => record.userId === user.id && record.status === 'active')
  if (!membership) {
    throw new Error('NO_ACTIVE_COMPANY')
  }

  return createSession(user.id, membership.companyId)
}

export function createPasswordResetToken(database: NovaDatabase, email: string) {
  const user = database.users.find((record) => record.email.toLowerCase() === email.toLowerCase())
  return {
    email: email.toLowerCase(),
    token: user ? `reset_${user.id}_${Date.now()}` : 'reset_request_received',
  }
}

function createSession(userId: string, activeCompanyId: string): Session {
  return { userId, activeCompanyId, token: `sess_${userId}_${activeCompanyId}_${Date.now()}` }
}

function hashPassword(password: string) {
  return `local-dev:${password.split('').reverse().join('')}`
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function now() {
  return new Date().toISOString()
}
