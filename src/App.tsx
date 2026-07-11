import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Check,
  Copy,
  Download,
  FileCheck2,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { calculateTotals, isValidDutchVatNumber, isValidEmail, isValidIban, nextDocumentNumber, validateDocumentLines, validateRequiredCustomer } from './foundation/business'
import { foundationRules, foundationSchema, tenantScopedTables } from './foundation/database'
import { createPrintableDocumentHtml } from './foundation/documents'
import { isUsageWithinPlan, planByName, planCatalog, usagePercentage, type PlanLimitKey, type PlanName, type PlanUsage } from './foundation/subscription'
import { createDocumentEmail, createInviteEmail, createInviteToken, safeDocumentFilename } from './foundation/workflows'
import { publicAuthRedirectUrl, submitAuth, updatePassword, type AuthMode } from './services/authService'
import {
  deleteRemoteRecord,
  createRemoteTeamInvite,
  loadRemoteWorkspace,
  upsertRemoteCompany,
  upsertRemoteCustomer,
  upsertRemoteInvoice,
  upsertRemoteProduct,
  upsertRemoteQuote,
  upsertRemoteSettings,
} from './services/remoteWorkspace'
import { getSupabaseClient } from './services/supabaseClient'
import { downloadServerPdf } from './services/pdfService'
import { sendDocumentEmail } from './services/documentSendService'
import { createWorkspaceStore } from './services/workspaceStore'
import './App.css'

type Screen =
  | 'login'
  | 'password-reset'
  | 'onboarding'
  | 'dashboard'
  | 'customers'
  | 'customer-form'
  | 'customer-detail'
  | 'invoices'
  | 'invoice-create'
  | 'invoice-edit'
  | 'invoice-detail'
  | 'quotes'
  | 'quote-create'
  | 'quote-edit'
  | 'quote-detail'
  | 'companies'
  | 'company-form'
  | 'roles'
  | 'database'
  | 'design-system'
  | 'products'
  | 'accounting'
  | 'bank'
  | 'documents'
  | 'vat'
  | 'reports'
  | 'tasks'
  | 'ai'
  | 'settings'
  | 'account'
  | 'subscription'

type InvoiceStatus = 'Concept' | 'Verzonden' | 'Betaald' | 'Verlopen'
type QuoteStatus = 'Concept' | 'Verzonden' | 'Geaccepteerd' | 'Afgewezen'
type CompanyRole = 'Eigenaar' | 'Beheerder' | 'Financieel medewerker' | 'Lezer'
type CompanyPlan = PlanName
type TeamStatus = 'Actief' | 'Uitgenodigd'

type Company = {
  id: string
  name: string
  role: CompanyRole
  plan: CompanyPlan
  chamber: string
  vat: string
  address: string
  postalCode: string
  city: string
  phone: string
  email: string
  iban: string
  bic: string
  logoUrl: string
}

type CompanySettings = {
  companyId: string
  defaultVat: number
  paymentTermDays: number
  invoicePrefix: string
  quotePrefix: string
  paymentReferencePrefix: string
  documentFooter: string
}

type TeamMember = {
  id: string
  companyId: string
  name: string
  email: string
  role: CompanyRole
  status: TeamStatus
}

type Product = {
  id: string
  companyId: string
  name: string
  description: string
  unitPrice: number
  vat: number
  category: 'Dienst' | 'Product' | 'Abonnement'
}

type Customer = {
  id: string
  companyId: string
  name: string
  contact: string
  email: string
  phone: string
  address: string
  postalCode: string
  city: string
  vat: string
  chamber: string
  revenue: number
}

type Invoice = {
  id: string
  companyId: string
  customerId: string
  number: string
  date: string
  due: string
  amount: number
  vat: number
  status: InvoiceStatus
  items: InvoiceRow[]
}

type Quote = {
  id: string
  companyId: string
  customerId: string
  number: string
  amount: number
  vat: number
  status: QuoteStatus
  validUntil: string
  items: InvoiceRow[]
}

type IncomingInvoiceStatus = 'Nieuw' | 'Herkennen' | 'Controle nodig' | 'Klaar om te boeken' | 'Geboekt'

type IncomingInvoice = {
  id: string
  companyId: string
  fileName: string
  uploadedAt: string
  supplier: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  amount: number
  vat: number
  category: string
  confidence: number
  status: IncomingInvoiceStatus
}

type AuditEvent = {
  id: string
  companyId: string
  action: string
  entityType: 'customer' | 'invoice' | 'quote' | 'company' | 'settings'
  entityId: string
  createdAt: string
}

type InvoiceRow = {
  description: string
  quantity: number
  price: number
  vat: number
}

function formatPostalAddress(input: { address?: string; postalCode?: string; city?: string }) {
  const street = input.address?.trim()
  const place = [input.postalCode, input.city].map((part) => part?.trim()).filter(Boolean).join(' ')
  return [street, place].filter(Boolean).join('\n')
}

const companyId = 'comp_muldersign'

const companies: Company[] = [
  {
    id: 'comp_muldersign',
    name: 'Muldersign',
    role: 'Eigenaar',
    plan: 'Brenqo Start',
    chamber: '88373630',
    vat: 'NL004592528B88',
    address: 'De Kolk 10',
    postalCode: '9656PJ',
    city: 'Spijkerboor',
    phone: '+31 (0) 639232306',
    email: 'administratie@muldersign.nl',
    iban: 'NL94 RABO 0338 4823 85',
    bic: 'RABONL2U',
    logoUrl: '/muldersign-logo.png',
  },
  {
    id: 'comp_brenqo_demo',
    name: 'Brenqo Demo BV',
    role: 'Beheerder',
    plan: 'Brenqo Start',
    chamber: '63091244',
    vat: 'NL809912344B01',
    address: 'Stationsplein 1',
    postalCode: '1012 AB',
    city: 'Den Haag',
    phone: '+31 (0) 20 000 0000',
    email: 'info@brenqo.nl',
    iban: 'NL00 BANK 0000 0000 00',
    bic: 'BANKNL2A',
    logoUrl: '',
  },
]

const roles = [
  { name: 'Eigenaar', access: 'Volledige toegang tot bedrijf, gebruikers, facturen en instellingen' },
  { name: 'Beheerder', access: 'Kan klanten, facturen en offertes beheren, maar geen eigenaarschap wijzigen' },
  { name: 'Financieel medewerker', access: 'Kan facturen en offertes maken, klantgegevens bekijken en exports voorbereiden' },
  { name: 'Lezer', access: 'Alleen lezen voor dashboard, klanten, facturen en offertes' },
]

const customers: Customer[] = [
  {
    id: 'cus_01',
    companyId,
    name: 'Studio Veldkamp',
    contact: 'Mila Veldkamp',
    email: 'mila@studioveldkamp.nl',
    phone: '020 445 1190',
    address: 'Keizersgracht 214',
    postalCode: '1016 DZ',
    city: 'Amsterdam',
    vat: 'NL862145901B01',
    chamber: '87124490',
    revenue: 18450,
  },
  {
    id: 'cus_02',
    companyId,
    name: 'Rijnhaven Logistics',
    contact: 'Samir El Idrissi',
    email: 'finance@rijnhaven.nl',
    phone: '010 882 4401',
    address: 'Rijnhaven 32',
    postalCode: '3072 AP',
    city: 'Rotterdam',
    vat: 'NL811020355B01',
    chamber: '69201844',
    revenue: 31200,
  },
  {
    id: 'cus_03',
    companyId,
    name: 'Nordbyte Systems',
    contact: 'Eva de Boer',
    email: 'eva@nordbyte.io',
    phone: '030 220 1788',
    address: 'Biltstraat 112',
    postalCode: '3572 BJ',
    city: 'Utrecht',
    vat: 'NL855903127B01',
    chamber: '74281033',
    revenue: 12780,
  },
  {
    id: 'cus_04',
    companyId: 'comp_brenqo_demo',
    name: 'Helder Merkadvies',
    contact: 'Lotte Kramer',
    email: 'lotte@heldermerk.nl',
    phone: '070 320 4402',
    address: 'Noordeinde 88',
    postalCode: '2514 GM',
    city: 'Den Haag',
    vat: 'NL809912344B01',
    chamber: '63091244',
    revenue: 8420,
  },
]

const invoices: Invoice[] = [
  {
    id: 'inv_01',
    companyId,
    customerId: 'cus_01',
    number: '2026-0142',
    date: '2026-07-01',
    due: '2026-07-15',
    amount: 3920,
    vat: 680,
    status: 'Verzonden',
    items: [
      { description: 'Merkstrategie sprint', quantity: 1, price: 2400, vat: 21 },
      { description: 'Implementatiebegeleiding', quantity: 1, price: 840, vat: 21 },
    ],
  },
  {
    id: 'inv_02',
    companyId,
    customerId: 'cus_02',
    number: '2026-0141',
    date: '2026-06-26',
    due: '2026-07-10',
    amount: 8470,
    vat: 1470,
    status: 'Betaald',
    items: [{ description: 'Procesoptimalisatie administratie', quantity: 1, price: 7000, vat: 21 }],
  },
  {
    id: 'inv_03',
    companyId,
    customerId: 'cus_03',
    number: '2026-0140',
    date: '2026-06-18',
    due: '2026-07-02',
    amount: 2118,
    vat: 368,
    status: 'Verlopen',
    items: [{ description: 'SaaS onboardingpakket', quantity: 1, price: 1750, vat: 21 }],
  },
  {
    id: 'inv_04',
    companyId,
    customerId: 'cus_01',
    number: '2026-0139',
    date: '2026-06-15',
    due: '2026-06-29',
    amount: 1452,
    vat: 252,
    status: 'Concept',
    items: [{ description: 'Campagneadvies', quantity: 1, price: 1200, vat: 21 }],
  },
  {
    id: 'inv_05',
    companyId: 'comp_brenqo_demo',
    customerId: 'cus_04',
    number: '2026-0031',
    date: '2026-07-01',
    due: '2026-07-15',
    amount: 1815,
    vat: 315,
    status: 'Verzonden',
    items: [{ description: 'Brand refresh', quantity: 1, price: 1500, vat: 21 }],
  },
]

const companySettings: CompanySettings[] = [
  { companyId: 'comp_muldersign', defaultVat: 21, paymentTermDays: 14, invoicePrefix: '2026', quotePrefix: 'OFF-2026', paymentReferencePrefix: 'Factuur', documentFooter: 'Bedankt voor de samenwerking. Vragen? Reageer op deze factuurmail.' },
  { companyId: 'comp_brenqo_demo', defaultVat: 21, paymentTermDays: 30, invoicePrefix: '2026', quotePrefix: 'OFF-2026', paymentReferencePrefix: 'Factuur', documentFooter: 'Bedankt voor je vertrouwen in Brenqo.' },
]

const teamMembers: TeamMember[] = [
  { id: 'mem_owner', companyId, name: 'Glen Mulder', email: 'glen@muldersign.nl', role: 'Eigenaar', status: 'Actief' },
  { id: 'mem_finance', companyId, name: 'Financieel team', email: 'finance@brenqo.nl', role: 'Financieel medewerker', status: 'Uitgenodigd' },
  { id: 'mem_orbit', companyId: 'comp_brenqo_demo', name: 'Brenqo beheer', email: 'beheer@brenqo.nl', role: 'Beheerder', status: 'Actief' },
]

const products: Product[] = [
  {
    id: 'prd_strategy',
    companyId,
    name: 'Adviespakket Groei',
    description: 'Strategisch advies en administratieve inrichting',
    unitPrice: 1250,
    vat: 21,
    category: 'Dienst',
  },
  {
    id: 'prd_support',
    companyId,
    name: 'Maandelijkse support',
    description: 'Doorlopende ondersteuning en optimalisatie',
    unitPrice: 395,
    vat: 21,
    category: 'Abonnement',
  },
  {
    id: 'prd_orbit_brand',
    companyId: 'comp_brenqo_demo',
    name: 'Brenqo onboarding sprint',
    description: 'Compact traject voor positionering en merkfundering',
    unitPrice: 1750,
    vat: 21,
    category: 'Dienst',
  },
]

const quotes: Quote[] = [
  {
    id: 'quo_01',
    companyId,
    customerId: 'cus_03',
    number: 'OFF-2026-055',
    amount: 6400,
    vat: 1111,
    status: 'Verzonden',
    validUntil: '2026-07-18',
    items: [{ description: 'Implementatie Brenqo workflow', quantity: 1, price: 5289, vat: 21 }],
  },
  {
    id: 'quo_02',
    companyId,
    customerId: 'cus_01',
    number: 'OFF-2026-054',
    amount: 2800,
    vat: 486,
    status: 'Geaccepteerd',
    validUntil: '2026-07-08',
    items: [{ description: 'Klantportaal inrichting', quantity: 1, price: 2314, vat: 21 }],
  },
  {
    id: 'quo_03',
    companyId,
    customerId: 'cus_02',
    number: 'OFF-2026-053',
    amount: 11900,
    vat: 2065,
    status: 'Concept',
    validUntil: '2026-07-26',
    items: [{ description: 'MKB administratiefundering', quantity: 1, price: 9835, vat: 21 }],
  },
  {
    id: 'quo_04',
    companyId: 'comp_brenqo_demo',
    customerId: 'cus_04',
    number: 'OFF-2026-012',
    amount: 3200,
    vat: 555,
    status: 'Concept',
    validUntil: '2026-07-28',
    items: [{ description: 'Brenqo startpakket', quantity: 1, price: 2645, vat: 21 }],
  },
]

const auditEvents: AuditEvent[] = [
  {
    id: 'evt_01',
    companyId,
    action: 'Factuur 2026-0142 verzonden naar Studio Veldkamp',
    entityType: 'invoice',
    entityId: 'inv_01',
    createdAt: '2026-07-02T09:12:00.000Z',
  },
  {
    id: 'evt_02',
    companyId,
    action: 'Offerte OFF-2026-054 geaccepteerd',
    entityType: 'quote',
    entityId: 'quo_02',
    createdAt: '2026-07-02T10:31:00.000Z',
  },
  {
    id: 'evt_03',
    companyId: 'comp_brenqo_demo',
    action: 'Factuur 2026-0031 verzonden naar Helder Merkadvies',
    entityType: 'invoice',
    entityId: 'inv_05',
    createdAt: '2026-07-02T11:05:00.000Z',
  },
]

const navItems = [
  ['dashboard', LayoutDashboard, 'Werkruimte'],
  ['customers', Users, 'Klanten'],
  ['quotes', FileCheck2, 'Offertes'],
  ['invoices', FileText, 'Facturen'],
  ['products', Package, 'Producten'],
  ['accounting', BookOpen, 'Boekhouding'],
  ['vat', FileCheck2, 'BTW'],
  ['bank', WalletCards, 'Bank'],
  ['reports', LayoutDashboard, 'Rapportages'],
  ['documents', FileText, 'Documenten'],
  ['tasks', Check, 'Taken'],
  ['ai', Sparkles, 'AI assistent'],
  ['companies', Building2, 'Werkruimtes'],
  ['roles', ShieldCheck, 'Team'],
  ['database', BookOpen, 'Database'],
  ['design-system', Package, 'Design system'],
  ['account', Users, 'Account'],
  ['settings', Settings, 'Instellingen'],
  ['subscription', WalletCards, 'Abonnement'],
] as const

const navGroups = [
  { title: 'Vandaag', items: ['dashboard'] },
  { title: 'Verkoop', items: ['customers', 'quotes', 'invoices'] },
  { title: 'Financien', items: ['products', 'accounting', 'vat', 'bank', 'reports'] },
  { title: 'Werkruimte', items: ['tasks', 'documents', 'ai', 'companies', 'account'] },
  { title: 'Beheer', items: ['roles', 'settings', 'subscription'] },
  { title: 'Systeem', items: ['database', 'design-system'] },
] as const

const navItemMap = new Map(navItems.map((item) => [item[0], item]))

const eur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })
const sessionKeys = {
  authenticated: 'brenqo.authenticated',
  onboarded: 'brenqo.onboarded',
  activeCompanyId: 'brenqo.activeCompanyId',
  pendingInviteToken: 'brenqo.pendingInviteToken',
} as const
const workspaceVersion = '2026-07-03-1'
const workspaceKeys = {
  version: 'brenqo.workspace.version',
  companies: 'brenqo.workspace.companies',
  companySettings: 'brenqo.workspace.companySettings',
  teamMembers: 'brenqo.workspace.teamMembers',
  products: 'brenqo.workspace.products',
  customers: 'brenqo.workspace.customers',
  invoices: 'brenqo.workspace.invoices',
  quotes: 'brenqo.workspace.quotes',
  incomingInvoices: 'brenqo.workspace.incomingInvoices',
  auditEvents: 'brenqo.workspace.auditEvents',
} as const

function readSessionFlag(key: string) {
  return typeof window !== 'undefined' && window.localStorage.getItem(key) === 'true'
}

function readWorkspaceRecords<T>(key: string, fallback: T[]) {
  const storage = typeof window === 'undefined' ? undefined : window.localStorage
  const records = createWorkspaceStore(storage, workspaceKeys.version, workspaceVersion).read(key, fallback)
  return Array.isArray(records) ? records : fallback
}

function writeWorkspaceRecords<T>(key: string, records: T[]) {
  const storage = typeof window === 'undefined' ? undefined : window.localStorage
  createWorkspaceStore(storage, workspaceKeys.version, workspaceVersion).write(key, records)
}

function rememberRemoteWorkspace(remote: {
  companies: Array<Record<string, unknown>>
  companySettings: unknown[]
  teamMembers: unknown[]
  products: unknown[]
  customers: unknown[]
  invoices: unknown[]
  quotes: unknown[]
  auditEvents: unknown[]
}) {
  const remoteCompanyId = String(remote.companies[0]?.id ?? '')
  if (!remoteCompanyId) {
    return ''
  }

  writeWorkspaceRecords(workspaceKeys.companies, remote.companies)
  writeWorkspaceRecords(workspaceKeys.companySettings, remote.companySettings)
  writeWorkspaceRecords(workspaceKeys.teamMembers, remote.teamMembers)
  writeWorkspaceRecords(workspaceKeys.products, remote.products)
  writeWorkspaceRecords(workspaceKeys.customers, remote.customers)
  writeWorkspaceRecords(workspaceKeys.invoices, remote.invoices)
  writeWorkspaceRecords(workspaceKeys.quotes, remote.quotes)
  writeWorkspaceRecords(workspaceKeys.auditEvents, remote.auditEvents)
  window.localStorage.setItem(sessionKeys.activeCompanyId, remoteCompanyId)
  window.localStorage.setItem(sessionKeys.onboarded, 'true')

  return remoteCompanyId
}

function resetWorkspaceStorage() {
  if (typeof window === 'undefined') {
    return
  }

  Object.values(workspaceKeys).forEach((key) => window.localStorage.removeItem(key))
}

function createRecordId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${prefix}_${Date.now()}`
}

function readActiveCompanyId() {
  if (typeof window === 'undefined') {
    return companyId
  }

  const storedCompanyId = window.localStorage.getItem(sessionKeys.activeCompanyId)
  const storedCompanies = readWorkspaceRecords(workspaceKeys.companies, companies)
  return storedCompanies.some((company) => company.id === storedCompanyId) ? storedCompanyId ?? companyId : companyId
}

function readPendingInviteToken() {
  if (typeof window === 'undefined') {
    return ''
  }

  const inviteToken = new URLSearchParams(window.location.search).get('invite')
  if (inviteToken) {
    window.localStorage.setItem(sessionKeys.pendingInviteToken, inviteToken)
    window.history.replaceState({}, '', window.location.pathname)
    return inviteToken
  }

  return window.localStorage.getItem(sessionKeys.pendingInviteToken) ?? ''
}

function isPasswordRecoveryUrl() {
  if (typeof window === 'undefined') {
    return false
  }

  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return query.get('reset') === '1' || query.get('type') === 'recovery' || hash.get('type') === 'recovery'
}

function requestedAuthMode(): AuthMode | null {
  if (typeof window === 'undefined') {
    return null
  }

  if (window.location.pathname.endsWith('/login')) return 'login'
  if (window.location.pathname.endsWith('/register')) return 'register'
  if (window.location.pathname.endsWith('/forgot')) return 'forgot'
  return null
}

function authUrl(mode: AuthMode) {
  return mode === 'register' ? '/register' : mode === 'forgot' ? '/forgot' : '/login'
}

function App() {
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [screen, setScreen] = useState<Screen>(() => {
    if (isPasswordRecoveryUrl()) {
      return 'password-reset'
    }

    if (!readSessionFlag(sessionKeys.authenticated)) {
      return 'login'
    }

    return readSessionFlag(sessionKeys.onboarded) ? 'dashboard' : 'onboarding'
  })
  const [activeCompanyId, setActiveCompanyIdState] = useState(readActiveCompanyId)
  const [companyRecords, setCompanyRecords] = useState<Company[]>(() => readWorkspaceRecords(workspaceKeys.companies, companies))
  const [settingsRecords, setSettingsRecords] = useState<CompanySettings[]>(() => readWorkspaceRecords(workspaceKeys.companySettings, companySettings))
  const [teamRecords, setTeamRecords] = useState<TeamMember[]>(() => readWorkspaceRecords(workspaceKeys.teamMembers, teamMembers))
  const [productRecords, setProductRecords] = useState<Product[]>(() => readWorkspaceRecords(workspaceKeys.products, products))
  const [customerRecords, setCustomerRecords] = useState<Customer[]>(() => readWorkspaceRecords(workspaceKeys.customers, customers))
  const [invoiceRecords, setInvoiceRecords] = useState<Invoice[]>(() => readWorkspaceRecords(workspaceKeys.invoices, invoices))
  const [quoteRecords, setQuoteRecords] = useState<Quote[]>(() => readWorkspaceRecords(workspaceKeys.quotes, quotes))
  const [incomingInvoiceRecords, setIncomingInvoiceRecords] = useState<IncomingInvoice[]>(() => readWorkspaceRecords(workspaceKeys.incomingInvoices, []))
  const [auditRecords, setAuditRecords] = useState<AuditEvent[]>(() => readWorkspaceRecords(workspaceKeys.auditEvents, auditEvents))
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0].id)
  const [selectedInvoice, setSelectedInvoice] = useState(invoices[0].id)
  const [selectedQuote, setSelectedQuote] = useState(quotes[0].id)
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const [syncMessage, setSyncMessage] = useState('')
  const [invitePreview, setInvitePreview] = useState<{ subject: string; body: string; link: string } | null>(null)
  const [pendingInviteToken] = useState(readPendingInviteToken)
  const [invoiceRows, setInvoiceRows] = useState([
    { description: 'Adviespakket Groei', quantity: 1, price: 1250, vat: 21 },
    { description: 'Maandelijkse support', quantity: 1, price: 395, vat: 21 },
  ])

  const companyCustomers = customerRecords.filter((customer) => customer.companyId === activeCompanyId)
  const companyInvoices = invoiceRecords.filter((invoice) => invoice.companyId === activeCompanyId)
  const companyQuotes = quoteRecords.filter((quote) => quote.companyId === activeCompanyId)
  const companyIncomingInvoices = incomingInvoiceRecords.filter((invoice) => invoice.companyId === activeCompanyId)
  const companyAuditEvents = auditRecords.filter((event) => event.companyId === activeCompanyId)
  const companyTeamMembers = teamRecords.filter((member) => member.companyId === activeCompanyId)
  const companyProducts = productRecords.filter((product) => product.companyId === activeCompanyId)
  const filteredCustomers = companyCustomers.filter((customer) => customerMatches(customer, globalSearch))
  const filteredInvoices = companyInvoices.filter((invoice) => invoiceMatches(invoice, companyCustomers, globalSearch))
  const filteredQuotes = companyQuotes.filter((quote) => quoteMatches(quote, companyCustomers, globalSearch))
  const filteredProducts = companyProducts.filter((product) => productMatches(product, globalSearch))
  const activeCompany = companyRecords.find((company) => company.id === activeCompanyId) ?? companyRecords[0] ?? companies[0]
  const activeSettings = settingsRecords.find((settings) => settings.companyId === activeCompanyId) ?? defaultSettingsFor(activeCompanyId)
  const currentCustomer = companyCustomers.find((customer) => customer.id === selectedCustomer) ?? companyCustomers[0]
  const currentInvoice = companyInvoices.find((invoice) => invoice.id === selectedInvoice) ?? companyInvoices[0]
  const currentQuote = companyQuotes.find((quote) => quote.id === selectedQuote) ?? companyQuotes[0]
  const invoiceTotal = calculateTotals(invoiceRows).total
  const nextInvoiceNumber = nextDocumentNumber(companyInvoices.map((invoice) => invoice.number), activeSettings.invoicePrefix)
  const nextQuoteNumber = nextDocumentNumber(companyQuotes.map((quote) => quote.number), activeSettings.quotePrefix, 3)
  const canEditFinancial = activeCompany.role !== 'Lezer'
  const canManageCompany = activeCompany.role === 'Eigenaar' || activeCompany.role === 'Beheerder'
  const dashboardChartData = useMemo(() => buildMonthlyInvoiceData(companyInvoices), [companyInvoices])
  const metrics = useMemo(() => {
    const currentMonth = todayIso().slice(0, 7)
    const monthInvoices = companyInvoices.filter((invoice) => invoice.date.slice(0, 7) === currentMonth)
    const revenue = monthInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)
    const open = companyInvoices.filter((invoice) => invoice.status !== 'Betaald').reduce((sum, invoice) => sum + invoice.amount, 0)
    const overdue = companyInvoices.filter((invoice) => invoice.status === 'Verlopen').reduce((sum, invoice) => sum + invoice.amount, 0)
    const vatDue = monthInvoices.reduce((sum, invoice) => sum + invoice.vat, 0)
    const paid = companyInvoices.filter((invoice) => invoice.status === 'Betaald').reduce((sum, invoice) => sum + invoice.amount, 0)
    return {
      open,
      overdue,
      revenue,
      costs: 0,
      profit: paid,
      vatDue,
    }
  }, [companyInvoices])
  const planUsage: PlanUsage = {
    companies: companyRecords.length,
    customers: companyCustomers.length,
    invoices: companyInvoices.length,
    quotes: companyQuotes.length,
    teamMembers: companyTeamMembers.length,
  }
  const activePlan = planByName(activeCompany.plan)
  const planHealthy = isUsageWithinPlan(planUsage, activePlan)

  const applyRemoteWorkspace = (remote: Awaited<ReturnType<typeof loadRemoteWorkspace>>, options: { openDashboard?: boolean } = {}) => {
    if (!remote || remote.companies.length === 0) {
      return false
    }

    setCompanyRecords(remote.companies as Company[])
    setSettingsRecords(remote.companySettings as CompanySettings[])
    setTeamRecords(remote.teamMembers as TeamMember[])
    setProductRecords(remote.products as Product[])
    setCustomerRecords(remote.customers as Customer[])
    setInvoiceRecords(remote.invoices as Invoice[])
    setQuoteRecords(remote.quotes as Quote[])
    setAuditRecords(remote.auditEvents as AuditEvent[])

    const remoteCompanyId = rememberRemoteWorkspace(remote)
    if (remoteCompanyId) {
      setActiveCompanyIdState(remoteCompanyId)
      if (options.openDashboard) {
        setScreen('dashboard')
      }
      return true
    }

    return false
  }

  const hydrateRemoteWorkspace = async () => {
    const client = getSupabaseClient()
    if (!client) {
      return false
    }

    const { data } = await client.auth.getSession()
    if (!data.session) {
      return false
    }

    const remote = await loadRemoteWorkspace(client)
    return applyRemoteWorkspace(remote, { openDashboard: true })
  }

  useEffect(() => {
    writeWorkspaceRecords(workspaceKeys.companies, companyRecords)
  }, [companyRecords])

  useEffect(() => {
    writeWorkspaceRecords(workspaceKeys.companySettings, settingsRecords)
  }, [settingsRecords])

  useEffect(() => {
    writeWorkspaceRecords(workspaceKeys.teamMembers, teamRecords)
  }, [teamRecords])

  useEffect(() => {
    writeWorkspaceRecords(workspaceKeys.products, productRecords)
  }, [productRecords])

  useEffect(() => {
    writeWorkspaceRecords(workspaceKeys.customers, customerRecords)
  }, [customerRecords])

  useEffect(() => {
    writeWorkspaceRecords(workspaceKeys.invoices, invoiceRecords)
  }, [invoiceRecords])

  useEffect(() => {
    writeWorkspaceRecords(workspaceKeys.quotes, quoteRecords)
  }, [quoteRecords])

  useEffect(() => {
    writeWorkspaceRecords(workspaceKeys.incomingInvoices, incomingInvoiceRecords)
  }, [incomingInvoiceRecords])

  useEffect(() => {
    writeWorkspaceRecords(workspaceKeys.auditEvents, auditRecords)
  }, [auditRecords])

  useEffect(() => {
    let active = true
    const client = getSupabaseClient()
    if (!client || !readSessionFlag(sessionKeys.authenticated)) {
      return () => {
        active = false
      }
    }

    void client.auth.getSession().then(async ({ data }) => {
      if (!active || !data.session) {
        return
      }

      const remote = await loadRemoteWorkspace(client)
      if (!active || !remote || remote.companies.length === 0) {
        return
      }

      applyRemoteWorkspace(remote)
    })

    return () => {
      active = false
    }
  }, [])

  const setActiveCompanyId = (nextCompanyId: string) => {
    setActiveCompanyIdState(nextCompanyId)
    window.localStorage.setItem(sessionKeys.activeCompanyId, nextCompanyId)
  }

  const completeLogin = async () => {
    setWorkspaceLoading(true)
    window.localStorage.setItem(sessionKeys.authenticated, 'true')
    const remoteLoaded = await hydrateRemoteWorkspace()
    setWorkspaceLoading(false)
    if (remoteLoaded) {
      return
    }

    setScreen(readSessionFlag(sessionKeys.onboarded) ? 'dashboard' : 'onboarding')
  }

  const completeOnboarding = async (company: Company) => {
    setCompanyRecords((records) => records.some((record) => record.id === company.id)
      ? records.map((record) => (record.id === company.id ? company : record))
      : [company, ...records])
    setSettingsRecords((records) => records.some((record) => record.companyId === company.id) ? records : [defaultSettingsFor(company.id), ...records])
    const client = getSupabaseClient()
    if (client) {
      try {
        await upsertRemoteCompany(client, company)
        setSyncMessage('Bedrijf ingericht.')
      } catch (error) {
        setSyncMessage(error instanceof Error ? `Supabase fout: ${error.message}` : 'Bedrijf lokaal ingericht.')
      }
    }
    window.localStorage.setItem(sessionKeys.onboarded, 'true')
    window.localStorage.setItem(sessionKeys.activeCompanyId, company.id)
    setActiveCompanyIdState(company.id)
    setScreen('dashboard')
  }

  const logout = () => {
    void getSupabaseClient()?.auth.signOut()
    window.localStorage.removeItem(sessionKeys.authenticated)
    setScreen('login')
  }

  if (screen === 'login') {
    const authMode = requestedAuthMode()
    if (authMode) {
      return <AuthPortal initialMode={authMode} pendingInviteToken={pendingInviteToken} onLogin={completeLogin} />
    }

    return <AuthScreen />
  }

  if (screen === 'password-reset') {
    return <PasswordResetScreen onDone={() => setScreen('login')} />
  }

  if (workspaceLoading) {
    return <WorkspaceLoading />
  }

  if (screen === 'onboarding') {
    return <OnboardingScreen company={activeCompany} onComplete={(company) => { void completeOnboarding(company) }} />
  }

  const navigate = (next: Screen) => {
    setScreen(next)
    setMenuOpen(false)
  }

  const requirePermission = (allowed: boolean, action: () => void, message = 'Je rol heeft geen rechten voor deze actie.') => {
    if (!allowed) {
      setSyncMessage(message)
      return
    }

    action()
  }

  const appendAudit = (companyId: string, action: string, entityType: AuditEvent['entityType'], entityId: string) => {
    setAuditRecords((records) => [
      {
        id: createRecordId('evt'),
        companyId,
        action,
        entityType,
        entityId,
        createdAt: new Date().toISOString(),
      },
      ...records,
    ])
  }

  const syncRemote = async (action: () => Promise<void>, success: string) => {
    const client = getSupabaseClient()
    if (!client) {
      setSyncMessage('')
      return true
    }

    setSyncMessage('Opslaan naar Supabase...')
    try {
      await action()
      setSyncMessage(success)
      return true
    } catch (error) {
      setSyncMessage(error instanceof Error ? `Supabase fout: ${error.message}` : 'Supabase fout: actie niet opgeslagen.')
      return false
    }
  }

  const addIncomingInvoices = (files: File[]) => {
    const supportedFiles = files.filter((file) => /pdf|png|jpe?g|webp/i.test(file.type) || /\.(pdf|png|jpe?g|webp)$/i.test(file.name))
    if (supportedFiles.length === 0) {
      setSyncMessage('Upload een PDF, JPG, PNG of WebP factuur.')
      return
    }

    const nextRecords = supportedFiles.map((file) => createIncomingInvoiceDraft(file, activeCompanyId))
    setIncomingInvoiceRecords((records) => [...nextRecords, ...records])
    nextRecords.forEach((record) => appendAudit(record.companyId, `Inkomende factuur herkend: ${record.fileName}`, 'invoice', record.id))
    setSyncMessage(`${nextRecords.length} inkomende factuur${nextRecords.length === 1 ? '' : 'en'} klaargezet voor controle.`)
  }

  const updateIncomingInvoiceStatus = (invoiceId: string, status: IncomingInvoiceStatus) => {
    setIncomingInvoiceRecords((records) => records.map((record) => (record.id === invoiceId ? { ...record, status } : record)))
    const incomingInvoice = incomingInvoiceRecords.find((record) => record.id === invoiceId)
    if (incomingInvoice) {
      appendAudit(incomingInvoice.companyId, `Inkomende factuur ${incomingInvoice.fileName} gemarkeerd als ${status.toLowerCase()}`, 'invoice', invoiceId)
    }
  }

  const deleteIncomingInvoice = (invoiceId: string) => {
    const incomingInvoice = incomingInvoiceRecords.find((record) => record.id === invoiceId)
    setIncomingInvoiceRecords((records) => records.filter((record) => record.id !== invoiceId))
    if (incomingInvoice) {
      appendAudit(incomingInvoice.companyId, `Inkomende factuur verwijderd: ${incomingInvoice.fileName}`, 'invoice', invoiceId)
    }
  }

  const saveCustomer = async (customer: Customer) => {
    const exists = customerRecords.some((record) => record.id === customer.id)
    setCustomerRecords((records) => {
      return exists ? records.map((record) => (record.id === customer.id ? customer : record)) : [customer, ...records]
    })
    await syncRemote((async () => upsertRemoteCustomer(getSupabaseClient()!, customer)), 'Klant opgeslagen.')
    appendAudit(customer.companyId, `${exists ? 'Klant bijgewerkt' : 'Klant toegevoegd'}: ${customer.name}`, 'customer', customer.id)
    setSelectedCustomer(customer.id)
    setEditingCustomerId(null)
    navigate('customer-detail')
  }

  const saveCompany = async (company: Company) => {
    const exists = companyRecords.some((record) => record.id === company.id)
    setCompanyRecords((records) => (exists ? records.map((record) => (record.id === company.id ? company : record)) : [company, ...records]))
    await syncRemote((async () => upsertRemoteCompany(getSupabaseClient()!, company)), 'Bedrijf opgeslagen.')
    appendAudit(company.id, `${exists ? 'Bedrijf bijgewerkt' : 'Bedrijf toegevoegd'}: ${company.name}`, 'company', company.id)
    setEditingCompanyId(null)
    setSettingsRecords((records) => records.some((record) => record.companyId === company.id) ? records : [defaultSettingsFor(company.id), ...records])
    setActiveCompanyId(company.id)
    navigate('companies')
  }

  const updateCompanyPlan = async (plan: CompanyPlan) => {
    const nextCompany = { ...activeCompany, plan }
    setCompanyRecords((records) => records.map((record) => (record.id === activeCompany.id ? nextCompany : record)))
    await syncRemote((async () => upsertRemoteCompany(getSupabaseClient()!, nextCompany)), 'Abonnement bijgewerkt.')
    appendAudit(activeCompany.id, `Abonnement gewijzigd naar ${plan}`, 'company', activeCompany.id)
  }

  const saveInvoice = async (invoice: Invoice) => {
    const exists = invoiceRecords.some((record) => record.id === invoice.id)
    setInvoiceRecords((records) => (exists ? records.map((record) => (record.id === invoice.id ? invoice : record)) : [invoice, ...records]))
    await syncRemote((async () => upsertRemoteInvoice(getSupabaseClient()!, invoice)), 'Factuur opgeslagen.')
    appendAudit(invoice.companyId, `Factuur ${invoice.number} ${exists ? 'bijgewerkt' : 'aangemaakt'} voor ${nameFor(invoice.customerId, customerRecords)}`, 'invoice', invoice.id)
    setSelectedInvoice(invoice.id)
    navigate('invoice-detail')
  }

  const saveQuote = async (quote: Quote) => {
    const exists = quoteRecords.some((record) => record.id === quote.id)
    setQuoteRecords((records) => (exists ? records.map((record) => (record.id === quote.id ? quote : record)) : [quote, ...records]))
    await syncRemote((async () => upsertRemoteQuote(getSupabaseClient()!, quote)), 'Offerte opgeslagen.')
    appendAudit(quote.companyId, `Offerte ${quote.number} ${exists ? 'bijgewerkt' : 'aangemaakt'} voor ${nameFor(quote.customerId, customerRecords)}`, 'quote', quote.id)
    setSelectedQuote(quote.id)
    navigate('quote-detail')
  }

  const deleteInvoice = async (invoice: Invoice) => {
    setInvoiceRecords((records) => records.filter((record) => record.id !== invoice.id))
    await syncRemote((async () => deleteRemoteRecord(getSupabaseClient()!, 'invoices', invoice.id)), 'Factuur verwijderd.')
    appendAudit(invoice.companyId, `Factuur ${invoice.number} verwijderd`, 'invoice', invoice.id)
    setSelectedInvoice(companyInvoices.find((record) => record.id !== invoice.id)?.id ?? invoices[0].id)
    navigate('invoices')
  }

  const deleteQuote = async (quote: Quote) => {
    setQuoteRecords((records) => records.filter((record) => record.id !== quote.id))
    await syncRemote((async () => deleteRemoteRecord(getSupabaseClient()!, 'quotes', quote.id)), 'Offerte verwijderd.')
    appendAudit(quote.companyId, `Offerte ${quote.number} verwijderd`, 'quote', quote.id)
    setSelectedQuote(companyQuotes.find((record) => record.id !== quote.id)?.id ?? quotes[0].id)
    navigate('quotes')
  }

  const duplicateInvoice = (invoice: Invoice) => {
    saveInvoice({ ...invoice, id: createRecordId('inv'), number: nextInvoiceNumber, status: 'Concept', date: todayIso(), due: addDaysIso(activeSettings.paymentTermDays) })
  }

  const duplicateQuote = (quote: Quote) => {
    saveQuote({ ...quote, id: createRecordId('quo'), number: nextQuoteNumber, status: 'Concept', validUntil: addDaysIso(21) })
  }

  const inviteTeamMember = async (input: Pick<TeamMember, 'name' | 'email' | 'role'>) => {
    const token = createInviteToken(input.email, activeCompanyId)
    const origin = window.location.origin
    const member: TeamMember = {
      ...input,
      id: token,
      companyId: activeCompanyId,
      status: 'Uitgenodigd',
    }
    setTeamRecords((records) => [member, ...records])
    await syncRemote((async () => createRemoteTeamInvite(getSupabaseClient()!, {
      ...input,
      token,
      companyId: activeCompanyId,
    })), 'Uitnodiging opgeslagen.')
    setInvitePreview(createInviteEmail({
      companyName: activeCompany.name,
      inviterName: activeCompany.email || activeCompany.name,
      inviteeName: input.name,
      inviteeEmail: input.email,
      role: input.role,
      token,
      origin,
    }))
    appendAudit(activeCompanyId, `Teamlid uitgenodigd: ${member.email}`, 'company', member.id)
  }

  const updateTeamRole = (memberId: string, role: CompanyRole) => {
    setTeamRecords((records) => records.map((record) => (record.id === memberId ? { ...record, role } : record)))
    appendAudit(activeCompanyId, 'Rol van teamlid bijgewerkt', 'company', memberId)
  }

  const saveSettings = async (settings: CompanySettings) => {
    setSettingsRecords((records) => (records.some((record) => record.companyId === settings.companyId)
      ? records.map((record) => (record.companyId === settings.companyId ? settings : record))
      : [settings, ...records]))
    await syncRemote((async () => upsertRemoteSettings(getSupabaseClient()!, settings)), 'Instellingen opgeslagen.')
    appendAudit(settings.companyId, 'Bedrijfsinstellingen bijgewerkt', 'settings', settings.companyId)
  }

  const saveProduct = async (product: Product) => {
    const exists = productRecords.some((record) => record.id === product.id)
    setProductRecords((records) => (exists ? records.map((record) => (record.id === product.id ? product : record)) : [product, ...records]))
    await syncRemote((async () => upsertRemoteProduct(getSupabaseClient()!, product)), 'Productregel opgeslagen.')
    appendAudit(product.companyId, `${exists ? 'Productregel bijgewerkt' : 'Productregel toegevoegd'}: ${product.name}`, 'settings', product.id)
  }

  const deleteProduct = async (productId: string) => {
    const product = productRecords.find((record) => record.id === productId)
    setProductRecords((records) => records.filter((record) => record.id !== productId))
    await syncRemote((async () => deleteRemoteRecord(getSupabaseClient()!, 'products', productId)), 'Productregel verwijderd.')
    if (product) {
      appendAudit(product.companyId, `Productregel verwijderd: ${product.name}`, 'settings', product.id)
    }
  }

  const updateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus) => {
    const invoice = invoiceRecords.find((record) => record.id === invoiceId)
    setInvoiceRecords((records) => records.map((record) => (record.id === invoiceId ? { ...record, status } : record)))
    if (invoice) {
      await syncRemote((async () => upsertRemoteInvoice(getSupabaseClient()!, { ...invoice, status })), 'Factuurstatus opgeslagen.')
      appendAudit(invoice.companyId, `Factuur ${invoice.number} gemarkeerd als ${status.toLowerCase()}`, 'invoice', invoice.id)
    }
  }

  const updateQuoteStatus = async (quoteId: string, status: QuoteStatus) => {
    const quote = quoteRecords.find((record) => record.id === quoteId)
    setQuoteRecords((records) => records.map((record) => (record.id === quoteId ? { ...record, status } : record)))
    if (quote) {
      await syncRemote((async () => upsertRemoteQuote(getSupabaseClient()!, { ...quote, status })), 'Offertestatus opgeslagen.')
      appendAudit(quote.companyId, `Offerte ${quote.number} gemarkeerd als ${status.toLowerCase()}`, 'quote', quote.id)
    }
  }

  const convertQuoteToInvoice = async (quote: Quote) => {
    const invoice: Invoice = {
      id: createRecordId('inv'),
      companyId: quote.companyId,
      customerId: quote.customerId,
      number: nextInvoiceNumber,
      date: todayIso(),
      due: addDaysIso(14),
      amount: quote.amount,
      vat: quote.vat,
      status: 'Concept',
      items: quote.items,
    }
    const acceptedQuote = { ...quote, status: 'Geaccepteerd' as QuoteStatus }
    setQuoteRecords((records) => records.map((record) => (record.id === quote.id ? acceptedQuote : record)))
    await syncRemote((async () => upsertRemoteQuote(getSupabaseClient()!, acceptedQuote)), 'Offerte omgezet.')
    appendAudit(quote.companyId, `Offerte ${quote.number} omgezet naar factuur ${invoice.number}`, 'quote', quote.id)
    await saveInvoice(invoice)
  }

  const resetWorkspace = () => {
    resetWorkspaceStorage()
    setCompanyRecords(companies)
    setSettingsRecords(companySettings)
    setTeamRecords(teamMembers)
    setProductRecords(products)
    setCustomerRecords(customers)
    setInvoiceRecords(invoices)
    setQuoteRecords(quotes)
    setAuditRecords(auditEvents)
    setSelectedCustomer(customers[0].id)
    setSelectedInvoice(invoices[0].id)
    setSelectedQuote(quotes[0].id)
    navigate('dashboard')
  }

  const exportWorkspace = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      activeCompanyId,
      companies: companyRecords,
      companySettings: settingsRecords,
      teamMembers: teamRecords,
      products: productRecords,
      customers: customerRecords,
      invoices: invoiceRecords,
      quotes: quoteRecords,
      auditEvents: auditRecords,
    }

    window.localStorage.setItem('brenqo.workspace.lastExport', JSON.stringify(payload))
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `brenqo-export-${todayIso()}.json`
    link.click()
    window.URL.revokeObjectURL(url)
    appendAudit(activeCompanyId, 'Werkruimte-export voorbereid', 'settings', activeCompanyId)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-head">
          <Brand />
          <button className="sidebar-close mobile-only" onClick={() => setMenuOpen(false)} aria-label="Menu sluiten">
            <X size={18} />
            Menu sluiten
          </button>
        </div>
        <div className="company-switch">
          <Building2 size={18} />
          <div>
            <strong>{activeCompany.name}</strong>
            <span>company_id: {activeCompany.id}</span>
          </div>
          <select value={activeCompanyId} onChange={(event) => setActiveCompanyId(event.target.value)}>
            {companyRecords.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
          </select>
        </div>
        <nav>
          {navGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <span>{group.title}</span>
              {group.items.map((id) => {
                const item = navItemMap.get(id)
                if (!item) return null
                const [screenId, Icon, label] = item
                return (
                  <button key={screenId} className={screen === screenId ? 'active' : ''} onClick={() => navigate(screenId as Screen)}>
                    <Icon size={18} />
                    {label}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="plan-card">
          <Sparkles size={18} />
          <strong>{activeCompany.plan}</strong>
          <span>{planHealthy ? 'Gebruik binnen pakket.' : 'Pakketlimiet bereikt.'}</span>
          <button onClick={() => navigate('subscription')}>Pakket bekijken</button>
        </div>
        <div className="sidebar-footer mobile-only">
          <button className="sidebar-logout" onClick={logout}>
            <LogOut size={18} />
            Uitloggen
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setMenuOpen((value) => !value)} aria-label="Menu openen">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <p className="eyebrow">Een besturingssysteem voor ondernemers</p>
            <h1>{titleFor(screen)}</h1>
          </div>
          <div className="topbar-actions">
            <div className="search">
              <Search size={17} />
              <input value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Zoek klant, factuur, offerte, KvK, IBAN of product" />
            </div>
            <button className="icon-button" aria-label="Meldingen">
              <Bell size={19} />
            </button>
            <button className="ghost" onClick={logout}>Uitloggen</button>
          </div>
        </header>
        {syncMessage && (
          <p className={syncMessage.startsWith('Supabase fout') ? 'form-error' : 'success-note'}>{syncMessage}</p>
        )}

        {screen === 'dashboard' && (
          <Dashboard
            metrics={metrics}
            activeCompany={activeCompany}
            dashboardCustomers={filteredCustomers}
            dashboardInvoices={filteredInvoices}
            dashboardQuotes={filteredQuotes}
            auditEvents={companyAuditEvents}
            chartData={dashboardChartData}
            onNavigate={navigate}
          />
        )}
        {screen === 'customers' && (
          <Customers
            customers={filteredCustomers}
            onAdd={() => requirePermission(canEditFinancial, () => {
              setEditingCustomerId(null)
              navigate('customer-form')
            })}
            onSelect={(id) => {
              setSelectedCustomer(id)
              navigate('customer-detail')
            }}
          />
        )}
        {screen === 'customer-form' && (
          <CustomerForm
            activeCompanyId={activeCompanyId}
            customer={editingCustomerId ? customerRecords.find((customer) => customer.id === editingCustomerId) : undefined}
            onCancel={() => navigate(editingCustomerId ? 'customer-detail' : 'customers')}
            onSave={saveCustomer}
          />
        )}
        {screen === 'customer-detail' && currentCustomer && (
          <CustomerDetail
            customer={currentCustomer}
            invoices={companyInvoices}
            quotes={companyQuotes}
            onBack={() => navigate('customers')}
            onEdit={() => {
              setEditingCustomerId(currentCustomer.id)
              navigate('customer-form')
            }}
          />
        )}
        {screen === 'customer-detail' && !currentCustomer && (
          <section className="panel">
            <PanelHeader title="Geen klant geselecteerd" action="Terug naar klanten" onAction={() => navigate('customers')} />
            <p>Deze administratie heeft nog geen klant om te openen.</p>
          </section>
        )}
        {screen === 'invoices' && (
          <Invoices
            invoices={companyInvoices}
            visibleInvoices={filteredInvoices}
            customers={companyCustomers}
            onCreate={() => requirePermission(canEditFinancial, () => navigate('invoice-create'))}
            onMarkPaid={(id) => requirePermission(canEditFinancial, () => { void updateInvoiceStatus(id, 'Betaald') })}
            onSelect={(id) => {
              setSelectedInvoice(id)
              navigate('invoice-detail')
            }}
          />
        )}
        {screen === 'invoice-create' && (
          <InvoiceCreate
            activeCompanyId={activeCompanyId}
            customers={companyCustomers}
            number={nextInvoiceNumber}
            settings={activeSettings}
            products={companyProducts}
            rows={invoiceRows}
            total={invoiceTotal}
            onRowsChange={setInvoiceRows}
            onBack={() => navigate('invoices')}
            onSave={(invoice) => { void saveInvoice(invoice) }}
          />
        )}
        {screen === 'invoice-detail' && currentInvoice && (
          <InvoiceDetail
            invoice={currentInvoice}
            customers={companyCustomers}
            company={activeCompany}
            settings={activeSettings}
            onBack={() => navigate('invoices')}
            onEdit={() => requirePermission(canEditFinancial, () => navigate('invoice-edit'))}
            onDuplicate={() => requirePermission(canEditFinancial, () => { void duplicateInvoice(currentInvoice) })}
            onDelete={() => requirePermission(canEditFinancial, () => { void deleteInvoice(currentInvoice) })}
            onStatusChange={(invoiceId, status) => requirePermission(canEditFinancial, () => { void updateInvoiceStatus(invoiceId, status) })}
          />
        )}
        {screen === 'invoice-edit' && currentInvoice && (
          <InvoiceCreate
            activeCompanyId={activeCompanyId}
            customers={companyCustomers}
            number={currentInvoice.number}
            settings={activeSettings}
            products={companyProducts}
            rows={currentInvoice.items}
            total={currentInvoice.amount}
            invoice={currentInvoice}
            onRowsChange={setInvoiceRows}
            onBack={() => navigate('invoice-detail')}
            onSave={(invoice) => { void saveInvoice(invoice) }}
          />
        )}
        {screen === 'quotes' && (
          <Quotes
            quotes={companyQuotes}
            visibleQuotes={filteredQuotes}
            customers={companyCustomers}
            onCreate={() => requirePermission(canEditFinancial, () => navigate('quote-create'))}
            onSelect={(id) => {
              setSelectedQuote(id)
              navigate('quote-detail')
            }}
          />
        )}
        {screen === 'quote-create' && (
          <QuoteCreate
            activeCompanyId={activeCompanyId}
            customers={companyCustomers}
            number={nextQuoteNumber}
            settings={activeSettings}
            products={companyProducts}
            onBack={() => navigate('quotes')}
            onSave={(quote) => { void saveQuote(quote) }}
          />
        )}
        {screen === 'quote-detail' && currentQuote && (
          <QuoteDetail
            quote={currentQuote}
            customers={companyCustomers}
            company={activeCompany}
            settings={activeSettings}
            onBack={() => navigate('quotes')}
            onEdit={() => requirePermission(canEditFinancial, () => navigate('quote-edit'))}
            onDuplicate={() => requirePermission(canEditFinancial, () => { void duplicateQuote(currentQuote) })}
            onDelete={() => requirePermission(canEditFinancial, () => { void deleteQuote(currentQuote) })}
            onConvert={(quote) => requirePermission(canEditFinancial, () => { void convertQuoteToInvoice(quote) })}
            onStatusChange={(quoteId, status) => requirePermission(canEditFinancial, () => { void updateQuoteStatus(quoteId, status) })}
          />
        )}
        {screen === 'quote-edit' && currentQuote && (
          <QuoteCreate
            activeCompanyId={activeCompanyId}
            customers={companyCustomers}
            number={currentQuote.number}
            settings={activeSettings}
            products={companyProducts}
            quote={currentQuote}
            onBack={() => navigate('quote-detail')}
            onSave={(quote) => { void saveQuote(quote) }}
          />
        )}
        {screen === 'companies' && (
          <Companies
            companies={companyRecords}
            activeCompanyId={activeCompanyId}
            onSelect={setActiveCompanyId}
            onAdd={() => requirePermission(canManageCompany, () => {
              setEditingCompanyId(null)
              navigate('company-form')
            })}
            onEdit={(id) => requirePermission(canManageCompany, () => {
              setEditingCompanyId(id)
              navigate('company-form')
            })}
          />
        )}
        {screen === 'company-form' && (
          <CompanyForm
            company={editingCompanyId ? companyRecords.find((company) => company.id === editingCompanyId) : undefined}
            onCancel={() => navigate('companies')}
            onSave={(company) => { void saveCompany(company) }}
          />
        )}
        {screen === 'products' && <Products products={filteredProducts} activeCompanyId={activeCompanyId} onSave={(product) => requirePermission(canEditFinancial, () => { void saveProduct(product) })} onDelete={(productId) => requirePermission(canEditFinancial, () => { void deleteProduct(productId) })} />}
        {screen === 'roles' && <Roles members={companyTeamMembers} canManage={canManageCompany} invitePreview={invitePreview} onInvite={(member) => requirePermission(canManageCompany, () => { void inviteTeamMember(member) })} onRoleChange={(memberId, role) => requirePermission(canManageCompany, () => updateTeamRole(memberId, role))} />}
        {screen === 'database' && <DatabaseFoundation />}
        {screen === 'design-system' && <DesignSystem />}
        {screen === 'settings' && (
          <SettingsPage
            activeCompany={activeCompany}
            settings={activeSettings}
            auditEvents={companyAuditEvents}
            onExport={exportWorkspace}
            onReset={() => requirePermission(canManageCompany, resetWorkspace)}
            onSaveSettings={(settings) => requirePermission(canManageCompany, () => { void saveSettings(settings) })}
          />
        )}
        {screen === 'account' && (
          <AccountPage
            activeCompany={activeCompany}
            members={companyTeamMembers}
            onLogout={logout}
            onNavigate={navigate}
          />
        )}
        {screen === 'subscription' && (
          <SubscriptionPage
            activeCompany={activeCompany}
            usage={planUsage}
            canManage={canManageCompany}
            onSelectPlan={(plan) => requirePermission(canManageCompany, () => { void updateCompanyPlan(plan) })}
          />
        )}
        {screen === 'reports' && (
          <ReportsPage
            metrics={metrics}
            invoices={companyInvoices}
            quotes={companyQuotes}
            customers={companyCustomers}
            chartData={dashboardChartData}
            onNavigate={navigate}
          />
        )}
        {screen === 'vat' && <VatPage metrics={metrics} invoices={companyInvoices} onNavigate={navigate} />}
        {screen === 'bank' && <BankPage invoices={companyInvoices} onNavigate={navigate} />}
        {screen === 'accounting' && <AccountingPage invoices={companyInvoices} auditEvents={companyAuditEvents} onNavigate={navigate} />}
        {screen === 'documents' && (
          <DocumentsPage
            invoices={companyInvoices}
            quotes={companyQuotes}
            incomingInvoices={companyIncomingInvoices}
            onUpload={addIncomingInvoices}
            onStatusChange={updateIncomingInvoiceStatus}
            onDelete={deleteIncomingInvoice}
            onNavigate={navigate}
          />
        )}
        {screen === 'tasks' && <TasksPage invoices={companyInvoices} quotes={companyQuotes} customers={companyCustomers} onNavigate={navigate} />}
        {screen === 'ai' && <AiAssistantPage metrics={metrics} invoices={companyInvoices} quotes={companyQuotes} customers={companyCustomers} onNavigate={navigate} />}
      </main>
    </div>
  )
}

function WorkspaceLoading() {
  return (
    <div className="onboarding-page">
      <Brand />
      <section className="onboarding-grid">
        <div>
          <p className="eyebrow">Werkruimte laden</p>
          <h1>We zetten je Brenqo omgeving klaar</h1>
          <p>Je bedrijf, rollen en administratie worden opgehaald uit Supabase.</p>
        </div>
        <div className="setup-form">
          <span className="pill">Even geduld</span>
          <strong>Live database verbonden</strong>
          <p>Na het laden opent automatisch je dashboard.</p>
        </div>
      </section>
    </div>
  )
}

function PasswordResetScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    const result = await updatePassword(getSupabaseClient(), password, confirmPassword)
    setBusy(false)
    setMessage(result.message)
    if (result.ok) {
      window.history.replaceState({}, '', `${window.location.pathname}`)
      setTimeout(onDone, 900)
    }
  }

  return (
    <div className="auth-page reset-page">
      <section className="auth-section reset-card">
        <div>
          <Brand />
          <span className="pill">Wachtwoord herstellen</span>
          <h2>Kies een nieuw wachtwoord</h2>
          <p>Je resetlink is geopend in Brenqo. Stel hieronder je nieuwe wachtwoord in en log daarna opnieuw in.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>Nieuw wachtwoord<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Minimaal 8 tekens met cijfer" /></label>
          <label>Herhaal wachtwoord<input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" placeholder="Nogmaals je wachtwoord" /></label>
          <button className="dark-button full" disabled={busy} type="submit">{busy ? 'Opslaan...' : 'Wachtwoord opslaan'}</button>
          {message && <p className={message.includes('bijgewerkt') ? 'success-note' : 'form-error'}>{message}</p>}
        </form>
      </section>
    </div>
  )
}

function AuthPortal({
  initialMode,
  pendingInviteToken,
  onLogin,
}: {
  initialMode: AuthMode
  pendingInviteToken: string
  onLogin: () => Promise<void>
}) {
  const [authMode] = useState<AuthMode>(initialMode)
  const [authName, setAuthName] = useState('Glen Mulder')
  const [authCompany, setAuthCompany] = useState('Muldersign')
  const [authEmail, setAuthEmail] = useState('administratie@muldersign.nl')
  const [authPassword, setAuthPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  const switchMode = (mode: AuthMode) => {
    window.location.href = authUrl(mode)
  }

  const submitAuthForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthBusy(true)
    setAuthMessage('')

    const result = await submitAuth(getSupabaseClient(), authMode, {
      email: authEmail,
      password: authPassword,
      name: authName,
      companyName: authCompany,
      redirectTo: publicAuthRedirectUrl(),
      inviteToken: pendingInviteToken,
    })

    setAuthBusy(false)
    setAuthMessage(result.message)
    if (result.openApp && authMode !== 'forgot') {
      if (pendingInviteToken) {
        window.localStorage.removeItem(sessionKeys.pendingInviteToken)
      }
      await onLogin()
    }
  }

  return (
    <div className="auth-page auth-portal-page">
      <section className="auth-portal">
        <div className="auth-portal-copy">
          <Brand />
          <span className="pill">Brenqo account</span>
          <h1>{authMode === 'login' ? 'Welkom terug' : authMode === 'forgot' ? 'Wachtwoord herstellen' : 'Start je werkruimte'}</h1>
          <p>{authMode === 'login' ? 'Log in op je werkruimte en ga direct verder met je administratie.' : authMode === 'forgot' ? 'Ontvang een resetlink die terugkomt in de Brenqo resetflow.' : 'Maak je account aan en open je eerste werkruimte.'}</p>
          {pendingInviteToken && <p className="success-note">Uitnodiging gevonden. Na inloggen of registreren word je automatisch toegevoegd aan het juiste bedrijf.</p>}
        </div>
        <form className="auth-form auth-portal-form" onSubmit={submitAuthForm}>
          {authMode === 'register' && (
            <>
              <label>Naam<input value={authName} onChange={(event) => setAuthName(event.target.value)} /></label>
              <label>Bedrijf<input value={authCompany} onChange={(event) => setAuthCompany(event.target.value)} /></label>
            </>
          )}
          <label>E-mailadres<input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} type="email" /></label>
          {authMode !== 'forgot' && <label>Wachtwoord<input value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} type="password" placeholder="Minimaal 8 tekens" /></label>}
          <button className="dark-button full" disabled={authBusy} type="submit">{authBusy ? 'Bezig...' : authMode === 'login' ? 'Inloggen' : authMode === 'forgot' ? 'Herstellink sturen' : 'Account aanmaken'}</button>
          <div className="auth-switcher">
            <button type="button" onClick={() => switchMode('login')}>Inloggen</button>
            <button type="button" onClick={() => switchMode('register')}>Registreren</button>
            <button type="button" onClick={() => switchMode('forgot')}>Wachtwoord vergeten</button>
          </div>
          {authMessage && <p className={authMessage.includes('geldig') || authMessage.includes('minimaal') ? 'form-error' : 'success-note'}>{authMessage}</p>}
        </form>
      </section>
    </div>
  )
}

function AuthScreen() {
  const [activeProduct, setActiveProduct] = useState('Facturen')
  const [demoName, setDemoName] = useState('')
  const [demoEmail, setDemoEmail] = useState('')
  const [demoSubmitted, setDemoSubmitted] = useState(false)
  const productViews = [
    {
      name: 'Facturen',
      title: 'Facturen maken zonder zoeken',
      metric: '€ 18.640',
      status: '12 openstaand',
      rows: ['Studio Veldkamp klaar voor verzending', 'Rijnhaven Logistics betaald', 'Nordbyte Systems herinnering nodig'],
    },
    {
      name: 'Offertes',
      title: 'Van offerte naar opdracht in één lijn',
      metric: '74%',
      status: 'acceptatie deze maand',
      rows: ['OFF-2026-055 wacht op akkoord', 'OFF-2026-054 geaccepteerd', 'Nieuwe offerte vanuit klantkaart'],
    },
    {
      name: 'CRM',
      title: 'Relaties, taken en omzet bij elkaar',
      metric: '42',
      status: 'actieve relaties',
      rows: ['Vervolgactie bij Studio Veldkamp', 'Nieuwe lead toegevoegd', 'Klantwaarde automatisch bijgewerkt'],
    },
    {
      name: 'Rapportages',
      title: 'Rustig overzicht voor betere keuzes',
      metric: '€ 32.540',
      status: 'resultaat dit kwartaal',
      rows: ['Omzet groeit 12,5%', 'BTW-reservering voorbereid', 'Cashflow blijft positief'],
    },
  ]
  const currentProduct = productViews.find((product) => product.name === activeProduct) ?? productViews[0]
  const scrollTo = (sectionId: string) => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const submitDemo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setDemoSubmitted(true)
  }
  const openAuth = (mode: AuthMode) => {
    window.location.href = authUrl(mode)
  }

  return (
    <div className="auth-page">
      <section className="landing-shell">
        <header className="landing-nav">
          <Brand />
          <nav className="landing-links" aria-label="Hoofdnavigatie">
            <button onClick={() => scrollTo('producten')}>Producten</button>
            <button onClick={() => scrollTo('prijzen')}>Prijzen</button>
            <button onClick={() => scrollTo('workflow')}>Workflow</button>
            <button onClick={() => scrollTo('demo')}>Demo</button>
          </nav>
          <div className="landing-actions">
            <button className="text-button" onClick={() => openAuth('login')}>Inloggen</button>
            <button className="dark-button" onClick={() => openAuth('register')}>Gratis proberen</button>
          </div>
        </header>

        <div className="landing-hero">
          <div className="hero-copy">
            <span className="pill">Een werkruimte voor je hele bedrijf.</span>
            <h1>Minder administratie. <span>Meer ondernemen.</span></h1>
            <p>Brenqo brengt verkoop, klanten, documenten en financiële signalen samen in een rustige werkruimte die met je meedenkt.</p>
            <div className="hero-actions">
              <button className="dark-button large" onClick={() => openAuth('register')}>Gratis proberen <ArrowRight size={17} /></button>
              <button className="light-button large" onClick={() => scrollTo('demo')}>Plan een demo</button>
            </div>
            <div className="trust-row">
              <span><Check size={16} /> 14 dagen gratis</span>
              <span><Check size={16} /> Geen creditcard nodig</span>
              <span><Check size={16} /> Altijd opzegbaar</span>
            </div>
          </div>

          <div className="hero-product">
            <div className="product-demo" aria-label="Interactieve Brenqo productdemo">
              <aside className="demo-sidebar">
                <Brand />
                {productViews.map((product) => (
                  <button
                    key={product.name}
                    className={product.name === activeProduct ? 'active' : ''}
                    onClick={() => setActiveProduct(product.name)}
                  >
                    {product.name}
                  </button>
                ))}
              </aside>
              <main className="demo-main">
                <div className="demo-topbar">
                  <div>
                    <span>Live werkruimte</span>
                    <strong>{currentProduct.title}</strong>
                  </div>
                  <label className="demo-search">
                    <Search size={16} />
                    <input placeholder="Zoek klant, factuur of offerte" readOnly />
                  </label>
                </div>
                <div className="demo-content">
                  <div className="demo-kpi">
                    <span>{activeProduct}</span>
                    <strong>{currentProduct.metric}</strong>
                    <small>{currentProduct.status}</small>
                  </div>
                  <div className="demo-chart">
                    {Array.from({ length: 14 }, (_, index) => <i key={index} style={{ height: `${34 + (index % 5) * 13}px` }} />)}
                  </div>
                  <div className="demo-list">
                    {currentProduct.rows.map((row) => <span key={row}><Check size={16} /> {row}</span>)}
                  </div>
                </div>
                <div className="preview-grid legacy-preview-grid">
                  <PreviewMetric title="Omzet" value="€ 125.430" tone="blue" />
                  <PreviewMetric title="Resultaat" value="€ 32.540" tone="green" />
                  <PreviewMetric title="Openstaand" value="€ 18.640" />
                  <div className="preview-card wide-preview">
                    <span>Cashflow</span>
                    <div className="bar-chart">{Array.from({ length: 20 }, (_, index) => <i key={index} style={{ height: `${24 + (index % 6) * 9}px` }} />)}</div>
                  </div>
                </div>
              </main>
            </div>

            <div className="phone-preview">
              <div className="phone-top"><strong>Brenqo</strong><Menu size={18} /></div>
              <span className="pill compact-pill">Alles onder controle.</span>
              <h2>Administratie zonder <span>gedoe</span></h2>
              <button className="dark-button full" onClick={() => openAuth('register')}>Gratis proberen</button>
              <PreviewMetric title="Omzet" value="€ 125.430" tone="blue" />
              <PreviewMetric title="Openstaand" value="€ 18.640" />
            </div>
          </div>
        </div>

        <section className="landing-products" id="producten">
          <h2>Alles voor je bedrijf. Een werkruimte.</h2>
          <p>Van offerte tot factuur, van klant tot inzicht. Brenqo groeit met je mee.</p>
          <div className="product-strip">
            {[
              ['Facturen', 'Maak, verstuur en volg facturen.'],
              ['Offertes', 'Van voorstel naar opdracht.'],
              ['CRM', 'Beheer relaties en klantwaarde.'],
              ['Producten', 'Sla diensten en prijzen op.'],
              ['Rapportages', 'Realtime inzicht in je cijfers.'],
              ['Rechten', 'Werk veilig met meerdere rollen.'],
            ].map(([title, text]) => (
              <button key={title} onClick={() => ['Facturen', 'Offertes', 'CRM', 'Rapportages'].includes(title) ? setActiveProduct(title) : scrollTo('workflow')}>
                <span><Sparkles size={22} /></span>
                <strong>{title}</strong>
                <p>{text}</p>
              </button>
            ))}
          </div>
          <button className="dark-button large" onClick={() => openAuth('register')}>Start met je werkruimte</button>
        </section>

        <section className="workflow-section" id="workflow">
          <div>
            <span className="pill">Minder klikken, meer gedaan</span>
            <h2>Een workflow die voelt alsof hij meedenkt</h2>
            <p>Brenqo is geen klassieke boekhoudlijst. Het is een werkruimte waar acties, signalen en documenten logisch samenkomen.</p>
          </div>
          <div className="workflow-grid">
            <article>
              <FilePlus2 size={24} />
              <strong>Maak sneller</strong>
              <p>Klantgegevens, productregels en documentnummers worden slim hergebruikt.</p>
            </article>
            <article>
              <ShieldCheck size={24} />
              <strong>Werk veiliger</strong>
              <p>Iedere administratie is gescheiden en rollen bepalen wie wat mag doen.</p>
            </article>
            <article>
              <BookOpen size={24} />
              <strong>Stuur beter</strong>
              <p>Dashboard, rapportages en auditlog geven direct grip op je bedrijf.</p>
            </article>
          </div>
        </section>

        <section className="pricing-section" id="prijzen">
          <div className="section-heading">
            <h2>Kies klein, groei later door</h2>
            <p>Voor de MVP staat de basis klaar. Pakketten zijn voorbereid zodat abonnementen later direct kunnen landen.</p>
          </div>
          <div className="price-grid">
            {[
              ['Start', '€ 0', 'Test de MVP met klanten, facturen en offertes.'],
              ['ZZP', '€ 19', 'Voor ondernemers die administratie sneller willen doen.'],
              ['MKB', '€ 49', 'Voor teams met meerdere bedrijven en rollen.'],
            ].map(([name, price, text]) => (
              <article key={name}>
                <span>Brenqo {name}</span>
                <strong>{price}<small>/ maand</small></strong>
                <p>{text}</p>
                <button className={name === 'ZZP' ? 'dark-button' : 'light-button'} onClick={() => openAuth('register')}>Probeer {name}</button>
              </article>
            ))}
          </div>
        </section>

        <section className="demo-section" id="demo">
          <div>
            <span className="pill">Even meekijken</span>
            <h2>Plan een demo of open direct de app</h2>
            <p>Laat je gegevens achter voor een demo-aanvraag, of ga meteen naar de werkende Brenqo MVP.</p>
          </div>
          <form className="demo-form" onSubmit={submitDemo}>
            <label>Naam<input value={demoName} onChange={(event) => setDemoName(event.target.value)} placeholder="Je naam" required /></label>
            <label>E-mailadres<input value={demoEmail} onChange={(event) => setDemoEmail(event.target.value)} placeholder="naam@bedrijf.nl" type="email" required /></label>
            <button className="dark-button full" type="submit">Demo aanvragen</button>
            <button className="light-button full" type="button" onClick={() => openAuth('login')}>Open de app</button>
            {demoSubmitted && <p className="success-note">Demo-aanvraag staat klaar voor {demoName || demoEmail}. In de backendfase koppelen we dit aan mail en CRM.</p>}
          </form>
        </section>

        <footer className="landing-footer">
          <Brand />
          <span>© Brenqo 2026</span>
          <button onClick={() => scrollTo('producten')}>Terug naar boven</button>
        </footer>
      </section>
    </div>
  )
}

function PreviewMetric({ title, value, tone }: { title: string; value: string; tone?: 'blue' | 'green' }) {
  return (
    <div className={`preview-card ${tone ?? ''}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>+12,5% vs vorige maand</small>
      <svg viewBox="0 0 180 54" role="img" aria-label={`${title} trend`}>
        <polyline points="4,44 24,40 42,42 60,32 78,36 96,28 114,31 132,20 150,14 176,18" />
      </svg>
    </div>
  )
}

function OnboardingScreen({ company, onComplete }: { company: Company; onComplete: (company: Company) => void }) {
  const [form, setForm] = useState<Company>(company)
  const [error, setError] = useState('')
  const update = (field: keyof Company, value: string) => setForm((current) => ({ ...current, [field]: value }))
  const resetDemo = () => {
    window.localStorage.removeItem(sessionKeys.onboarded)
    window.localStorage.removeItem(sessionKeys.activeCompanyId)
    window.location.reload()
  }
  const complete = () => {
    if (!form.name.trim() || !form.chamber.trim() || !form.vat.trim() || !form.email.includes('@')) {
      setError('Vul minimaal bedrijfsnaam, KvK, BTW en geldig e-mailadres in.')
      return
    }

    onComplete(form)
  }

  return (
    <div className="onboarding-page">
      <Brand />
      <section className="onboarding-grid">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h1>Richt je bedrijfsomgeving in</h1>
          <p>Brenqo koppelt alle administratie aan een bedrijf, zodat het platform geschikt blijft voor meerdere gebruikers en administraties.</p>
          <div className="data-model">
            {['Users', 'Companies', 'Memberships', 'Roles', 'Customers', 'Invoices', 'InvoiceItems', 'Quotes', 'QuoteItems'].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <form className="setup-form">
          {error && <p className="form-error">{error}</p>}
          <label>Bedrijfsnaam<input value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
          <label>KvK-nummer<input value={form.chamber} onChange={(event) => update('chamber', event.target.value)} /></label>
          <label>BTW-nummer<input value={form.vat} onChange={(event) => update('vat', event.target.value)} /></label>
          <label>E-mail<input value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
          <label>Adres<input value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
          <label>Postcode<input value={form.postalCode} onChange={(event) => update('postalCode', event.target.value)} /></label>
          <label>Plaats<input value={form.city} onChange={(event) => update('city', event.target.value)} /></label>
          <label>Startpakket<select value={form.plan} onChange={(event) => update('plan', event.target.value)}><option>Brenqo Start</option><option>Brenqo ZZP</option><option>Brenqo MKB</option><option>Brenqo Enterprise</option></select></label>
          <button type="button" className="primary" onClick={complete}>Dashboard openen <ArrowRight size={18} /></button>
          <button type="button" className="ghost full" onClick={resetDemo}>Demo opnieuw starten</button>
        </form>
      </section>
    </div>
  )
}

function Dashboard({
  metrics,
  activeCompany,
  dashboardCustomers,
  dashboardInvoices,
  dashboardQuotes,
  auditEvents,
  chartData,
  onNavigate,
}: {
  metrics: Record<string, number>
  activeCompany: Company
  dashboardCustomers: Customer[]
  dashboardInvoices: Invoice[]
  dashboardQuotes: Quote[]
  auditEvents: AuditEvent[]
  chartData: Array<{ month: string; omzet: number; winst: number }>
  onNavigate: (screen: Screen) => void
}) {
  const openInvoices = dashboardInvoices.filter((invoice) => invoice.status !== 'Betaald')
  const expiringQuotes = dashboardQuotes.filter((quote) => quote.status === 'Verzonden').length
  const todayTasks = [
    `${openInvoices.length} facturen opvolgen`,
    `${dashboardQuotes.filter((quote) => quote.status === 'Concept').length} offertes afmaken`,
    `BTW-reservering controleren: ${eur.format(metrics.vatDue)}`,
    `${dashboardCustomers.length} klantrelaties actueel houden`,
  ]
  const aiInsights = [
    metrics.revenue > 0 ? `Je omzet deze maand staat op ${eur.format(metrics.revenue)}.` : 'Maak je eerste factuur om omzetinzicht te starten.',
    openInvoices.length > 0 ? `${openInvoices.length} facturen staan nog open. Verstuur vandaag een korte herinnering.` : 'Geen openstaande facturen. Je cashflow is rustig.',
    expiringQuotes > 0 ? `${expiringQuotes} verzonden offertes vragen opvolging.` : 'Er zijn geen verzonden offertes die nu aandacht vragen.',
  ]
  const readiness = [
    { label: 'Bedrijfsgegevens', ready: Boolean(activeCompany.email && activeCompany.iban && activeCompany.vat), action: 'Instellingen', screen: 'settings' as Screen },
    { label: 'Klantenbestand', ready: dashboardCustomers.length > 0, action: 'Klanten', screen: 'customers' as Screen },
    { label: 'Factuurproces', ready: dashboardInvoices.length > 0, action: 'Facturen', screen: 'invoices' as Screen },
    { label: 'Offerteproces', ready: dashboardQuotes.length > 0, action: 'Offertes', screen: 'quotes' as Screen },
    { label: 'Controlepad', ready: auditEvents.length > 0, action: 'Rapportages', screen: 'reports' as Screen },
  ]
  const readinessScore = Math.round((readiness.filter((item) => item.ready).length / readiness.length) * 100)

  return (
    <div className="content-grid">
      <section className="workspace-hero panel wide">
        <div>
          <p className="eyebrow">Goedemorgen</p>
          <h2>{activeCompany.name}: vandaag in je werkruimte</h2>
          <p>Minder administratie. Meer ondernemen.</p>
        </div>
        <div className="hero-counter">
          <span>Nog te ontvangen</span>
          <strong>{eur.format(metrics.open)}</strong>
          <em>{openInvoices.length} facturen</em>
        </div>
      </section>

      <section className="kpi-grid">
        <Metric label="Omzet deze maand" value={eur.format(metrics.revenue)} trend="+14% vs vorige maand" />
        <Metric label="Nog te ontvangen" value={eur.format(metrics.open)} trend={`${openInvoices.length} facturen`} />
        <Metric label="BTW" value={eur.format(metrics.vatDue)} trend="nog 17 dagen" />
        <Metric label="Kasstroom" value={eur.format(metrics.profit - metrics.open)} trend="verwacht saldo" />
      </section>

      <section className="panel wide">
        <PanelHeader title="Omzet en resultaat" action="Bekijk facturen" onAction={() => onNavigate('invoices')} />
        <div className="chart">
          <ResponsiveContainer>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => eur.format(Number(value))} />
              <Area type="monotone" dataKey="omzet" stroke="#1877f2" fill="#dbeafe" strokeWidth={3} />
              <Area type="monotone" dataKey="winst" stroke="#13a36f" fill="#dcfce7" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <PanelHeader title="Vandaag" />
        <div className="task-list live-list">
          {todayTasks.map((task) => <span key={task}><Check size={16} /> {task}</span>)}
        </div>
      </section>

      <section className="panel ai-panel">
        <PanelHeader title="AI suggesties" />
        <div className="suggestions">
          {aiInsights.map((insight) => <span key={insight}><Sparkles size={16} /> {insight}</span>)}
        </div>
      </section>

      <section className="panel">
        <PanelHeader title={`MVP gereedheid ${readinessScore}%`} />
        <div className="checklist readiness-list">
          {readiness.map((item) => (
            <button key={item.label} className={item.ready ? 'ok' : 'attention'} onClick={() => onNavigate(item.screen)}>
              <Check size={16} />
              <strong>{item.label}</strong>
              <small>{item.ready ? 'Klaar' : item.action}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelHeader title="Snelle acties" />
        <div className="quick-actions">
          <button onClick={() => onNavigate('invoice-create')}><FilePlus2 size={18} /> Factuur maken</button>
          <button onClick={() => onNavigate('quotes')}><FileCheck2 size={18} /> Offerte maken</button>
          <button onClick={() => onNavigate('companies')}><Building2 size={18} /> Bedrijf wisselen</button>
          <button onClick={() => onNavigate('customers')}><Users size={18} /> Klanten beheren</button>
        </div>
      </section>

      <section className="panel">
        <PanelHeader title="Activiteit" />
        <div className="suggestions">
          {auditEvents.slice(0, 4).map((event) => (
            <span key={event.id}><Check size={16} /> {event.action}</span>
          ))}
          {auditEvents.length === 0 && <span><Check size={16} /> Tenantfilter actief voor {dashboardCustomers.length} klanten</span>}
        </div>
      </section>

      <section className="panel wide">
        <PanelHeader title="Recente facturen" action="Nieuwe factuur" onAction={() => onNavigate('invoice-create')} />
        <DataTable
          columns={['Factuur', 'Klant', 'Vervaldatum', 'Bedrag', 'Status']}
          rows={dashboardInvoices.slice(0, 4).map((invoice) => [invoice.number, nameFor(invoice.customerId, dashboardCustomers), invoice.due, eur.format(invoice.amount), <Status key={invoice.id} label={invoice.status} />])}
        />
      </section>
    </div>
  )
}

function Customers({ customers, onAdd, onSelect }: { customers: Customer[]; onAdd: () => void; onSelect: (id: string) => void }) {
  return (
    <section className="panel">
      <PanelHeader title="Klantenoverzicht" action="Klant toevoegen" onAction={onAdd} />
      {customers.length === 0 ? (
        <EmptyState title="Nog geen klanten" text="Begin met een klant, daarna maak je sneller offertes en facturen." action="Klant toevoegen" onAction={onAdd} />
      ) : (
        <DataTable
          columns={['Bedrijf', 'Contactpersoon', 'E-mail', 'Telefoon', 'Plaats', 'Omzet', '']}
          rows={customers.map((customer) => [
            customer.name,
            customer.contact,
            customer.email,
            customer.phone,
            customer.city,
            eur.format(customer.revenue),
            <button key={customer.id} className="table-link" onClick={() => onSelect(customer.id)}>Openen</button>,
          ])}
        />
      )}
    </section>
  )
}

function CustomerForm({
  activeCompanyId,
  customer,
  onCancel,
  onSave,
}: {
  activeCompanyId: string
  customer?: Customer
  onCancel: () => void
  onSave: (customer: Customer) => void
}) {
  const [form, setForm] = useState<Customer>(() => customer ?? {
    id: createRecordId('cus'),
    companyId: activeCompanyId,
    name: '',
    contact: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
    vat: '',
    chamber: '',
    revenue: 0,
  })
  const [error, setError] = useState('')

  const update = (field: keyof Customer, value: string | number) => setForm((current) => ({ ...current, [field]: value }))
  const submit = () => {
    if (!validateRequiredCustomer(form)) {
      setError('Vul minimaal bedrijfsnaam, geldig e-mailadres en plaats in.')
      return
    }

    onSave({ ...form, companyId: activeCompanyId })
  }

  return (
    <section className="panel">
      <PanelHeader title={customer ? 'Klant bewerken' : 'Klant toevoegen'} />
      {error && <p className="form-error">{error}</p>}
      <div className="form-grid">
        <label>Bedrijfsnaam<input value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
        <label>Contactpersoon<input value={form.contact} onChange={(event) => update('contact', event.target.value)} /></label>
        <label>E-mail<input value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
        <label>Telefoon<input value={form.phone} onChange={(event) => update('phone', event.target.value)} /></label>
        <label>Adres<input value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
        <label>Postcode<input value={form.postalCode} onChange={(event) => update('postalCode', event.target.value)} /></label>
        <label>Plaats<input value={form.city} onChange={(event) => update('city', event.target.value)} /></label>
        <label>BTW-nummer<input value={form.vat} onChange={(event) => update('vat', event.target.value)} /></label>
        <label>KvK-nummer<input value={form.chamber} onChange={(event) => update('chamber', event.target.value)} /></label>
      </div>
      <div className="invoice-actions">
        <button className="primary" onClick={submit}>Klant opslaan</button>
        <button className="ghost" onClick={onCancel}>Annuleren</button>
      </div>
    </section>
  )
}

function CustomerDetail({
  customer,
  invoices,
  quotes,
  onBack,
  onEdit,
}: {
  customer: Customer
  invoices: Invoice[]
  quotes: Quote[]
  onBack: () => void
  onEdit: () => void
}) {
  const customerInvoices = invoices.filter((invoice) => invoice.customerId === customer.id)
  const customerQuotes = quotes.filter((quote) => quote.customerId === customer.id)
  return (
    <div className="content-grid">
      <section className="panel">
        <button className="table-link" onClick={onBack}>Terug naar klanten</button>
        <div className="panel-header flush">
          <h2>{customer.name}</h2>
          <button className="primary" onClick={onEdit}>Klant bewerken</button>
        </div>
        <div className="detail-list">
          <span>Contactpersoon<strong>{customer.contact}</strong></span>
          <span>E-mail<strong>{customer.email}</strong></span>
          <span>Telefoon<strong>{customer.phone}</strong></span>
          <span>Adres<strong>{customer.address}, {customer.postalCode} {customer.city}</strong></span>
          <span>BTW-nummer<strong>{customer.vat}</strong></span>
          <span>KvK-nummer<strong>{customer.chamber}</strong></span>
        </div>
      </section>
      <section className="panel">
        <PanelHeader title="Facturen" />
        <DataTable columns={['Nummer', 'Vervaldatum', 'Bedrag', 'Status']} rows={customerInvoices.map((invoice) => [invoice.number, invoice.due, eur.format(invoice.amount), <Status key={invoice.id} label={invoice.status} />])} />
      </section>
      <section className="panel wide">
        <PanelHeader title="Offertes" />
        <DataTable columns={['Nummer', 'Geldig tot', 'Bedrag', 'Status']} rows={customerQuotes.map((quote) => [quote.number, quote.validUntil, eur.format(quote.amount), <Status key={quote.id} label={quote.status} />])} />
      </section>
    </div>
  )
}

function Invoices({
  invoices,
  visibleInvoices,
  customers,
  onCreate,
  onMarkPaid,
  onSelect,
}: {
  invoices: Invoice[]
  visibleInvoices: Invoice[]
  customers: Customer[]
  onCreate: () => void
  onMarkPaid: (id: string) => void
  onSelect: (id: string) => void
}) {
  const [statusFilter, setStatusFilter] = useState<'Alle statussen' | InvoiceStatus>('Alle statussen')
  const rows = visibleInvoices.filter((invoice) => statusFilter === 'Alle statussen' || invoice.status === statusFilter)

  return (
    <section className="panel">
      <PanelHeader title="Factuuroverzicht" action="Nieuwe factuur" onAction={onCreate} />
      <div className="filters">
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'Alle statussen' | InvoiceStatus)}>
          <option>Alle statussen</option>
          <option>Concept</option>
          <option>Verzonden</option>
          <option>Betaald</option>
          <option>Verlopen</option>
        </select>
        <span>{rows.length} van {invoices.length} facturen</span>
        <span>Zoeken via de balk bovenin</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Nog geen facturen" text="Maak een nieuwe factuur of open een voorbeeld vanuit je werkruimte." action="Nieuwe factuur" onAction={onCreate} />
      ) : (
        <DataTable
          columns={['Factuur', 'Klant', 'Datum', 'Vervaldatum', 'Bedrag', 'BTW', 'Status', 'Actie']}
          rows={rows.map((invoice) => [
            invoice.number,
            nameFor(invoice.customerId, customers),
            invoice.date,
            invoice.due,
            eur.format(invoice.amount),
            eur.format(invoice.vat),
            <Status key={invoice.id} label={invoice.status} />,
            <div key={invoice.id} className="table-actions">
              <button className="table-link" onClick={() => onSelect(invoice.id)}>Openen</button>
              {invoice.status !== 'Betaald' && <button className="table-link" onClick={() => onMarkPaid(invoice.id)}>Betaald</button>}
            </div>,
          ])}
        />
      )}
    </section>
  )
}

function InvoiceCreate({
  activeCompanyId,
  customers,
  number,
  settings,
  products,
  rows,
  total: initialTotal,
  invoice,
  onRowsChange,
  onBack,
  onSave,
}: {
  activeCompanyId: string
  customers: Customer[]
  number: string
  settings: CompanySettings
  products: Product[]
  rows: InvoiceRow[]
  total: number
  invoice?: Invoice
  onRowsChange: (rows: InvoiceRow[]) => void
  onBack: () => void
  onSave: (invoice: Invoice) => void
}) {
  const [customerId, setCustomerId] = useState(invoice?.customerId ?? customers[0]?.id ?? '')
  const [invoiceDate, setInvoiceDate] = useState(invoice?.date ?? todayIso())
  const [dueDate, setDueDate] = useState(invoice?.due ?? addDaysIso(settings.paymentTermDays))
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status ?? 'Concept')
  const [editableRows, setEditableRows] = useState<InvoiceRow[]>(invoice?.items ?? rows)
  const [error, setError] = useState('')
  const total = invoice ? calculateTotals(editableRows).total : initialTotal
  const subtotal = editableRows.reduce((sum, row) => sum + row.quantity * row.price, 0)
  const vatTotal = total - subtotal
  const addRow = () => setEditableRows([...editableRows, { description: 'Nieuwe regel', quantity: 1, price: 0, vat: settings.defaultVat }])
  const addProduct = (productId: string) => {
    const product = products.find((record) => record.id === productId)
    if (product) {
      changeRows([...editableRows, { description: product.name, quantity: 1, price: product.unitPrice, vat: product.vat }])
    }
  }
  const changeRows = (nextRows: InvoiceRow[]) => {
    setEditableRows(nextRows)
    if (!invoice) {
      onRowsChange(nextRows)
    }
  }
  const removeRow = (index: number) => changeRows(editableRows.filter((_, rowIndex) => rowIndex !== index))
  const save = () => {
    const rowValidation = validateDocumentLines(editableRows)
    if (!customerId || !rowValidation.ok) {
      setError(!customerId ? 'Kies eerst een klant.' : rowValidation.message)
      return
    }

    if (dueDate < invoiceDate) {
      setError('De vervaldatum mag niet voor de factuurdatum liggen.')
      return
    }

    onRowsChange(editableRows)
    onSave({
      id: invoice?.id ?? createRecordId('inv'),
      companyId: activeCompanyId,
      customerId,
      number,
      date: invoiceDate,
      due: dueDate,
      amount: total,
      vat: vatTotal,
      status,
      items: editableRows,
    })
  }

  if (customers.length === 0) {
    return (
      <section className="panel">
        <button className="table-link" onClick={onBack}>Terug naar facturen</button>
        <PanelHeader title="Maak eerst een klant aan" />
        <p>Facturen hebben altijd een klant nodig. Voeg eerst een klant toe en maak daarna direct je eerste factuur.</p>
      </section>
    )
  }

  return (
    <div className="invoice-builder">
      <section className="panel">
        <button className="table-link" onClick={onBack}>Terug naar facturen</button>
        <PanelHeader title={invoice ? 'Factuur bewerken' : 'Nieuwe factuur'} />
        {error && <p className="form-error">{error}</p>}
        <div className="form-grid">
          <label>Klant<select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
          <label>Factuurnummer<input value={number} readOnly /></label>
          <label>Factuurdatum<input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} /></label>
          <label>Vervaldatum<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          <label>Betalingstermijn<select value={dueDate} onChange={(event) => setDueDate(event.target.value)}><option value={addDaysIso(7)}>7 dagen</option><option value={addDaysIso(14)}>14 dagen</option><option value={addDaysIso(30)}>30 dagen</option></select></label>
          <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as InvoiceStatus)}><option>Concept</option><option>Verzonden</option><option>Betaald</option><option>Verlopen</option></select></label>
        </div>
        <div className="line-header">
          <span>Omschrijving</span>
          <span>Aantal</span>
          <span>Prijs</span>
          <span>BTW</span>
          <span>Totaal</span>
          <span></span>
        </div>
        <div className="line-items">
          {editableRows.map((row, index) => (
            <div className="line-row" key={`${row.description}-${index}`}>
              <input value={row.description} onChange={(event) => updateRow(editableRows, changeRows, index, 'description', event.target.value)} />
              <input type="number" value={row.quantity} onChange={(event) => updateRow(editableRows, changeRows, index, 'quantity', Number(event.target.value))} />
              <input type="number" value={row.price} onChange={(event) => updateRow(editableRows, changeRows, index, 'price', Number(event.target.value))} />
              <select value={row.vat} onChange={(event) => updateRow(editableRows, changeRows, index, 'vat', Number(event.target.value))}><option value={21}>21%</option><option value={9}>9%</option><option value={0}>0%</option></select>
              <strong>{eur.format(row.quantity * row.price * (1 + row.vat / 100))}</strong>
              <button className="icon-button compact" onClick={() => removeRow(index)} aria-label="Regel verwijderen"><X size={16} /></button>
            </div>
          ))}
        </div>
        <div className="invoice-actions">
          <select defaultValue="" onChange={(event) => {
            addProduct(event.target.value)
            event.target.value = ''
          }}>
            <option value="">Productregel toevoegen</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
          <button className="ghost" onClick={addRow}><Plus size={17} /> Regel toevoegen</button>
          <button className="primary" onClick={save}>Factuur opslaan</button>
        </div>
      </section>
      <aside className="panel preview">
        <p className="eyebrow">PDF-preview</p>
        <h2>Factuur {number}</h2>
        <div className="preview-meta">
          <span>{nameFor(customerId, customers)}</span>
          <span>Vervalt op {dueDate}</span>
        </div>
        <div className="preview-lines">
          {editableRows.map((row, index) => (
            <span key={`${row.description}-preview-${index}`}>
              <small>{row.description}</small>
              <strong>{eur.format(row.quantity * row.price)}</strong>
            </span>
          ))}
        </div>
        <div className="invoice-summary">
          <span>Subtotaal<strong>{eur.format(subtotal)}</strong></span>
          <span>BTW<strong>{eur.format(vatTotal)}</strong></span>
          <span className="summary-total">Totaal<strong>{eur.format(total)}</strong></span>
        </div>
        <Status label={status} />
        <button className="primary full" onClick={save}>Factuur opslaan</button>
      </aside>
    </div>
  )
}

function InvoiceDetail({
  invoice,
  customers,
  company,
  settings,
  onBack,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
}: {
  invoice: Invoice
  customers: Customer[]
  company: Company
  settings: CompanySettings
  onBack: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onStatusChange: (invoiceId: string, status: InvoiceStatus) => void
}) {
  const totals = calculateTotals(invoice.items)
  const customer = customers.find((record) => record.id === invoice.customerId)
  const [sendBusy, setSendBusy] = useState(false)
  const [sendMessage, setSendMessage] = useState('')
  const documentEmail = createDocumentEmail({
    type: 'invoice',
    number: invoice.number,
    customerName: customer?.name ?? 'klant',
    companyName: company.name,
    total: eur.format(invoice.amount),
    dueOrValidDate: invoice.due,
  })
  const printableDocument = {
      type: 'invoice',
      number: invoice.number,
      status: invoice.status,
      companyName: company.name,
      companyVat: company.vat,
      companyChamber: company.chamber,
      companyAddress: formatPostalAddress(company),
      companyEmail: company.email,
      companyPhone: company.phone,
      companyIban: company.iban,
      companyBic: company.bic,
      companyLogoUrl: company.logoUrl,
      paymentReference: `${settings.paymentReferencePrefix} ${invoice.number}`,
      footerNote: settings.documentFooter,
      customerName: customer?.name ?? 'Onbekende klant',
      customerAddress: customer ? formatPostalAddress(customer) : '',
      date: invoice.date,
      dueDate: invoice.due,
      lines: invoice.items,
  } as const
  const download = () => downloadHtml(
    safeDocumentFilename('factuur', invoice.number),
    createPrintableDocumentHtml(printableDocument),
  )
  const downloadPdf = async () => {
    await downloadServerPdf({
      ...printableDocument,
      title: `Factuur ${invoice.number}`,
      filename: safeDocumentFilename('factuur', invoice.number, 'pdf'),
      total: eur.format(invoice.amount),
    })
  }
  const sendInvoice = async () => {
    if (!customer?.email) {
      setSendMessage('Deze klant heeft nog geen e-mailadres.')
      return
    }

    setSendBusy(true)
    setSendMessage('')
    try {
      const message = await sendDocumentEmail({
        to: customer.email,
        from: company.email || 'send@brenqo.nl',
        replyTo: company.email || 'send@brenqo.nl',
        subject: documentEmail.subject,
        body: documentEmail.body,
        filename: safeDocumentFilename('factuur', invoice.number, 'pdf'),
        document: {
          ...printableDocument,
          title: `Factuur ${invoice.number}`,
          total: eur.format(invoice.amount),
        },
      })
      setSendMessage(`${message} Naar ${customer.email}.`)
      if (invoice.status === 'Concept') {
        onStatusChange(invoice.id, 'Verzonden')
      }
    } catch (error) {
      setSendMessage(error instanceof Error ? error.message : 'Factuur kon niet worden verstuurd.')
    } finally {
      setSendBusy(false)
    }
  }

  return (
    <div className="invoice-builder">
      <section className="panel">
        <button className="table-link" onClick={onBack}>Terug naar facturen</button>
        <div className="panel-header flush">
          <h2>Factuur {invoice.number}</h2>
          <Status label={invoice.status} />
        </div>
        <div className="detail-list">
          <span>Klant<strong>{nameFor(invoice.customerId, customers)}</strong></span>
          <span>Factuurdatum<strong>{invoice.date}</strong></span>
          <span>Vervaldatum<strong>{invoice.due}</strong></span>
          <span>company_id<strong>{invoice.companyId}</strong></span>
        </div>
        <DataTable
          columns={['Omschrijving', 'Aantal', 'Prijs', 'BTW', 'Totaal']}
          rows={invoice.items.map((item) => [item.description, String(item.quantity), eur.format(item.price), `${item.vat}%`, eur.format(item.quantity * item.price * (1 + item.vat / 100))])}
        />
        <div className="invoice-actions">
          <button className="primary" onClick={onEdit}>Bewerken</button>
          <button className="ghost" onClick={onDuplicate}><Copy size={17} /> Dupliceren</button>
          {(['Concept', 'Verzonden', 'Betaald', 'Verlopen'] as InvoiceStatus[]).map((status) => (
            <button key={status} className={invoice.status === status ? 'primary' : 'ghost'} onClick={() => onStatusChange(invoice.id, status)}>
              {status}
            </button>
          ))}
          <button className="ghost danger" onClick={onDelete}><Trash2 size={17} /> Verwijderen</button>
        </div>
      </section>
      <aside className="panel preview">
        <p className="eyebrow">Print-preview</p>
        <h2>{invoice.number}</h2>
        <div className="invoice-summary">
          <span>Subtotaal<strong>{eur.format(totals.subtotal)}</strong></span>
          <span>BTW<strong>{eur.format(totals.vatTotal)}</strong></span>
          <span className="summary-total">Totaal<strong>{eur.format(totals.total)}</strong></span>
        </div>
        <button className="primary full" onClick={() => { void downloadPdf().catch(() => download()) }}>Download PDF</button>
        <button className="dark-button full" disabled={sendBusy || !customer?.email} onClick={() => { void sendInvoice() }}>
          {sendBusy ? 'Versturen...' : 'Verstuur factuur'}
        </button>
        {sendMessage && <p className={sendMessage.includes('verstuurd') ? 'success-note' : 'form-error'}>{sendMessage}</p>}
        <button className="ghost full" onClick={() => window.print()}>Printen</button>
        <button className="ghost full" onClick={download}><Download size={17} /> Download document</button>
        <button className="ghost full" onClick={() => void navigator.clipboard?.writeText(`${documentEmail.subject}\n\n${documentEmail.body}`)}>Kopieer verzendmail</button>
      </aside>
    </div>
  )
}

function Quotes({
  quotes,
  visibleQuotes,
  customers,
  onCreate,
  onSelect,
}: {
  quotes: Quote[]
  visibleQuotes: Quote[]
  customers: Customer[]
  onCreate: () => void
  onSelect: (id: string) => void
}) {
  const [statusFilter, setStatusFilter] = useState<'Alle statussen' | QuoteStatus>('Alle statussen')
  const rows = visibleQuotes.filter((quote) => statusFilter === 'Alle statussen' || quote.status === statusFilter)

  return (
    <section className="panel">
      <PanelHeader title="Offerte overzicht" action="Nieuwe offerte" onAction={onCreate} />
      <div className="filters">
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'Alle statussen' | QuoteStatus)}>
          <option>Alle statussen</option>
          <option>Concept</option>
          <option>Verzonden</option>
          <option>Geaccepteerd</option>
          <option>Afgewezen</option>
        </select>
        <span>{rows.length} van {quotes.length} offertes</span>
        <span>Zoeken via de balk bovenin</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Nog geen offertes" text="Maak een voorstel dat later met een klik naar factuur kan." action="Nieuwe offerte" onAction={onCreate} />
      ) : (
        <DataTable
          columns={['Offerte', 'Klant', 'Geldig tot', 'Bedrag', 'Status', 'Actie']}
          rows={rows.map((quote) => [
            quote.number,
            nameFor(quote.customerId, customers),
            quote.validUntil,
            eur.format(quote.amount),
            <Status key={quote.id} label={quote.status} />,
            <button key={quote.id} className="table-link" onClick={() => onSelect(quote.id)}>Openen</button>,
          ])}
        />
      )}
    </section>
  )
}

function QuoteCreate({
  activeCompanyId,
  customers,
  number,
  settings,
  products,
  quote,
  onBack,
  onSave,
}: {
  activeCompanyId: string
  customers: Customer[]
  number: string
  settings: CompanySettings
  products: Product[]
  quote?: Quote
  onBack: () => void
  onSave: (quote: Quote) => void
}) {
  const [customerId, setCustomerId] = useState(quote?.customerId ?? customers[0]?.id ?? '')
  const [validUntil, setValidUntil] = useState(quote?.validUntil ?? addDaysIso(21))
  const [status, setStatus] = useState<QuoteStatus>(quote?.status ?? 'Concept')
  const [rows, setRows] = useState<InvoiceRow[]>(quote?.items ?? [{ description: 'Nieuw voorstel', quantity: 1, price: 1500, vat: settings.defaultVat }])
  const [error, setError] = useState('')
  const totals = calculateTotals(rows)
  const addRow = () => setRows([...rows, { description: 'Nieuwe regel', quantity: 1, price: 0, vat: settings.defaultVat }])
  const addProduct = (productId: string) => {
    const product = products.find((record) => record.id === productId)
    if (product) {
      setRows([...rows, { description: product.name, quantity: 1, price: product.unitPrice, vat: product.vat }])
    }
  }
  const save = () => {
    const rowValidation = validateDocumentLines(rows)
    if (!customerId || !rowValidation.ok) {
      setError(!customerId ? 'Kies eerst een klant.' : rowValidation.message)
      return
    }

    if (validUntil < todayIso()) {
      setError('De geldigheidsdatum mag niet in het verleden liggen.')
      return
    }

    onSave({
      id: quote?.id ?? createRecordId('quo'),
      companyId: activeCompanyId,
      customerId,
      number,
      amount: totals.total,
      vat: totals.vatTotal,
      status,
      validUntil,
      items: rows,
    })
  }

  if (customers.length === 0) {
    return (
      <section className="panel">
        <button className="table-link" onClick={onBack}>Terug naar offertes</button>
        <PanelHeader title="Maak eerst een klant aan" />
        <p>Offertes hebben altijd een klant nodig. Voeg eerst een klant toe en maak daarna direct je eerste offerte.</p>
      </section>
    )
  }

  return (
    <div className="invoice-builder">
      <section className="panel">
        <button className="table-link" onClick={onBack}>Terug naar offertes</button>
        <PanelHeader title={quote ? 'Offerte bewerken' : 'Nieuwe offerte'} />
        {error && <p className="form-error">{error}</p>}
        <div className="form-grid">
          <label>Klant<select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
          <label>Offertenummer<input value={number} readOnly /></label>
          <label>Geldig tot<input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></label>
          <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as QuoteStatus)}><option>Concept</option><option>Verzonden</option><option>Geaccepteerd</option><option>Afgewezen</option></select></label>
        </div>
        <div className="line-header">
          <span>Omschrijving</span>
          <span>Aantal</span>
          <span>Prijs</span>
          <span>BTW</span>
          <span>Totaal</span>
          <span></span>
        </div>
        <div className="line-items">
          {rows.map((row, index) => (
            <div className="line-row" key={`${row.description}-${index}`}>
              <input value={row.description} onChange={(event) => updateRow(rows, setRows, index, 'description', event.target.value)} />
              <input type="number" value={row.quantity} onChange={(event) => updateRow(rows, setRows, index, 'quantity', Number(event.target.value))} />
              <input type="number" value={row.price} onChange={(event) => updateRow(rows, setRows, index, 'price', Number(event.target.value))} />
              <select value={row.vat} onChange={(event) => updateRow(rows, setRows, index, 'vat', Number(event.target.value))}><option value={21}>21%</option><option value={9}>9%</option><option value={0}>0%</option></select>
              <strong>{eur.format(row.quantity * row.price * (1 + row.vat / 100))}</strong>
              <button className="icon-button compact" onClick={() => setRows(rows.filter((_, rowIndex) => rowIndex !== index))} aria-label="Regel verwijderen"><X size={16} /></button>
            </div>
          ))}
        </div>
        <div className="invoice-actions">
          <select defaultValue="" onChange={(event) => {
            addProduct(event.target.value)
            event.target.value = ''
          }}>
            <option value="">Productregel toevoegen</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
          <button className="ghost" onClick={addRow}><Plus size={17} /> Regel toevoegen</button>
          <button className="primary" onClick={save}>Offerte opslaan</button>
        </div>
      </section>
      <aside className="panel preview">
        <p className="eyebrow">Offerte-preview</p>
        <h2>{number}</h2>
        <div className="preview-meta">
          <span>{nameFor(customerId, customers)}</span>
          <span>Geldig tot {validUntil}</span>
        </div>
        <div className="invoice-summary">
          <span>Subtotaal<strong>{eur.format(totals.subtotal)}</strong></span>
          <span>BTW<strong>{eur.format(totals.vatTotal)}</strong></span>
          <span className="summary-total">Totaal<strong>{eur.format(totals.total)}</strong></span>
        </div>
        <Status label={status} />
      </aside>
    </div>
  )
}

function QuoteDetail({
  quote,
  customers,
  company,
  settings,
  onBack,
  onEdit,
  onDuplicate,
  onDelete,
  onConvert,
  onStatusChange,
}: {
  quote: Quote
  customers: Customer[]
  company: Company
  settings: CompanySettings
  onBack: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onConvert: (quote: Quote) => void
  onStatusChange: (quoteId: string, status: QuoteStatus) => void
}) {
  const totals = calculateTotals(quote.items)
  const customer = customers.find((record) => record.id === quote.customerId)
  const documentEmail = createDocumentEmail({
    type: 'quote',
    number: quote.number,
    customerName: customer?.name ?? 'klant',
    companyName: company.name,
    total: eur.format(quote.amount),
    dueOrValidDate: quote.validUntil,
  })
  const printableDocument = {
      type: 'quote',
      number: quote.number,
      status: quote.status,
      companyName: company.name,
      companyVat: company.vat,
      companyChamber: company.chamber,
      companyAddress: formatPostalAddress(company),
      companyEmail: company.email,
      companyPhone: company.phone,
      companyIban: company.iban,
      companyBic: company.bic,
      companyLogoUrl: company.logoUrl,
      paymentReference: `${settings.paymentReferencePrefix} ${quote.number}`,
      footerNote: settings.documentFooter,
      customerName: customer?.name ?? 'Onbekende klant',
      customerAddress: customer ? formatPostalAddress(customer) : '',
      date: todayIso(),
      validUntil: quote.validUntil,
      lines: quote.items,
  } as const
  const download = () => downloadHtml(
    safeDocumentFilename('offerte', quote.number),
    createPrintableDocumentHtml(printableDocument),
  )
  const downloadPdf = async () => {
    await downloadServerPdf({
      ...printableDocument,
      title: `Offerte ${quote.number}`,
      filename: safeDocumentFilename('offerte', quote.number, 'pdf'),
      total: eur.format(quote.amount),
    })
  }

  return (
    <div className="invoice-builder">
      <section className="panel">
        <button className="table-link" onClick={onBack}>Terug naar offertes</button>
        <div className="panel-header flush">
          <h2>Offerte {quote.number}</h2>
          <Status label={quote.status} />
        </div>
        <div className="detail-list">
          <span>Klant<strong>{nameFor(quote.customerId, customers)}</strong></span>
          <span>Geldig tot<strong>{quote.validUntil}</strong></span>
          <span>company_id<strong>{quote.companyId}</strong></span>
        </div>
        <DataTable
          columns={['Omschrijving', 'Aantal', 'Prijs', 'BTW', 'Totaal']}
          rows={quote.items.map((item) => [item.description, String(item.quantity), eur.format(item.price), `${item.vat}%`, eur.format(item.quantity * item.price * (1 + item.vat / 100))])}
        />
        <div className="invoice-actions">
          <button className="primary" onClick={onEdit}>Bewerken</button>
          <button className="ghost" onClick={onDuplicate}><Copy size={17} /> Dupliceren</button>
          {(['Concept', 'Verzonden', 'Geaccepteerd', 'Afgewezen'] as QuoteStatus[]).map((status) => (
            <button key={status} className={quote.status === status ? 'primary' : 'ghost'} onClick={() => onStatusChange(quote.id, status)}>
              {status}
            </button>
          ))}
          <button className="primary" onClick={() => onConvert(quote)}>Omzetten naar factuur</button>
          <button className="primary" onClick={() => { void downloadPdf().catch(() => download()) }}>Download PDF</button>
          <button className="ghost" onClick={() => window.print()}>Printen</button>
          <button className="ghost" onClick={download}><Download size={17} /> Download document</button>
          <button className="ghost" onClick={() => void navigator.clipboard?.writeText(`${documentEmail.subject}\n\n${documentEmail.body}`)}>Kopieer verzendmail</button>
          <button className="ghost danger" onClick={onDelete}><Trash2 size={17} /> Verwijderen</button>
        </div>
      </section>
      <aside className="panel preview">
        <p className="eyebrow">Offerte-preview</p>
        <h2>{quote.number}</h2>
        <div className="invoice-summary">
          <span>Subtotaal<strong>{eur.format(totals.subtotal)}</strong></span>
          <span>BTW<strong>{eur.format(totals.vatTotal)}</strong></span>
          <span className="summary-total">Totaal<strong>{eur.format(totals.total)}</strong></span>
        </div>
      </aside>
    </div>
  )
}

function Companies({
  companies,
  activeCompanyId,
  onSelect,
  onAdd,
  onEdit,
}: {
  companies: Company[]
  activeCompanyId: string
  onSelect: (companyId: string) => void
  onAdd: () => void
  onEdit: (companyId: string) => void
}) {
  return (
    <section className="panel">
      <PanelHeader title="Werkruimtes" action="Werkruimte toevoegen" onAction={onAdd} />
      <DataTable
        columns={['Bedrijf', 'Plaats', 'Rol', 'Pakket', 'KvK', 'BTW', 'Acties']}
        rows={companies.map((company) => [
          company.name,
          company.city,
          company.role,
          company.plan,
          company.chamber,
          company.vat,
          <div key={company.id} className="table-actions">
            <button className="table-link" onClick={() => onSelect(company.id)}>
              {company.id === activeCompanyId ? 'Actief' : 'Activeren'}
            </button>
            <button className="table-link" onClick={() => onEdit(company.id)}>Bewerken</button>
          </div>,
        ])}
      />
    </section>
  )
}

function CompanyForm({
  company,
  onCancel,
  onSave,
}: {
  company?: Company
  onCancel: () => void
  onSave: (company: Company) => void
}) {
  const [name, setName] = useState(company?.name ?? '')
  const [address, setAddress] = useState(company?.address ?? '')
  const [postalCode, setPostalCode] = useState(company?.postalCode ?? '')
  const [city, setCity] = useState(company?.city ?? '')
  const [phone, setPhone] = useState(company?.phone ?? '')
  const [email, setEmail] = useState(company?.email ?? '')
  const [iban, setIban] = useState(company?.iban ?? '')
  const [bic, setBic] = useState(company?.bic ?? '')
  const [chamber, setChamber] = useState(company?.chamber ?? '')
  const [vat, setVat] = useState(company?.vat ?? '')
  const [role, setRole] = useState<CompanyRole>(company?.role ?? 'Eigenaar')
  const [plan, setPlan] = useState<CompanyPlan>(company?.plan ?? 'Brenqo Start')
  const [error, setError] = useState('')

  const save = () => {
    if (!name.trim() || !address.trim() || !postalCode.trim() || !city.trim() || !chamber.trim() || !vat.trim()) {
      setError('Vul bedrijfsnaam, adres, plaats, KvK en BTW-nummer in.')
      return
    }

    if (email && !isValidEmail(email)) {
      setError('Vul een geldig bedrijfs-e-mailadres in.')
      return
    }

    if (!/^\d{8}$/.test(chamber.replace(/\s+/g, ''))) {
      setError('Vul een geldig KvK-nummer van 8 cijfers in.')
      return
    }

    if (!isValidDutchVatNumber(vat)) {
      setError('Vul een geldig Nederlands BTW-nummer in, bijvoorbeeld NL123456789B01.')
      return
    }

    if (!isValidIban(iban)) {
      setError('Vul een geldig IBAN in of laat het veld leeg.')
      return
    }

    onSave({
      id: company?.id ?? createRecordId('comp'),
      name,
      address,
      postalCode,
      city,
      phone,
      email,
      iban,
      bic,
      logoUrl: company?.logoUrl ?? '',
      chamber,
      vat,
      role,
      plan,
    })
  }

  return (
    <section className="panel">
      <button className="table-link" onClick={onCancel}>Terug naar bedrijven</button>
      <PanelHeader title={company ? 'Bedrijf bewerken' : 'Bedrijf toevoegen'} />
      {error && <p className="form-error">{error}</p>}
      <div className="form-grid">
        <label>Bedrijfsnaam<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Adres<input value={address} onChange={(event) => setAddress(event.target.value)} /></label>
        <label>Postcode<input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} /></label>
        <label>Plaats<input value={city} onChange={(event) => setCity(event.target.value)} /></label>
        <label>E-mail<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Telefoon<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        <label>KvK-nummer<input value={chamber} onChange={(event) => setChamber(event.target.value)} /></label>
        <label>BTW-nummer<input value={vat} onChange={(event) => setVat(event.target.value)} /></label>
        <label>IBAN<input value={iban} onChange={(event) => setIban(event.target.value)} /></label>
        <label>BIC<input value={bic} onChange={(event) => setBic(event.target.value)} /></label>
        <label>Rol<select value={role} onChange={(event) => setRole(event.target.value as CompanyRole)}><option>Eigenaar</option><option>Beheerder</option><option>Financieel medewerker</option><option>Lezer</option></select></label>
        <label>Pakket<select value={plan} onChange={(event) => setPlan(event.target.value as CompanyPlan)}><option>Brenqo Start</option><option>Brenqo ZZP</option><option>Brenqo MKB</option><option>Brenqo Enterprise</option></select></label>
      </div>
      <div className="invoice-actions">
        <button className="ghost" onClick={onCancel}>Annuleren</button>
        <button className="primary" onClick={save}>Bedrijf opslaan</button>
      </div>
    </section>
  )
}

function Products({
  products,
  activeCompanyId,
  onSave,
  onDelete,
}: {
  products: Product[]
  activeCompanyId: string
  onSave: (product: Product) => void
  onDelete: (productId: string) => void
}) {
  const emptyProduct = (): Product => ({
    id: createRecordId('prd'),
    companyId: activeCompanyId,
    name: '',
    description: '',
    unitPrice: 0,
    vat: 21,
    category: 'Dienst',
  })
  const [form, setForm] = useState<Product>(emptyProduct)
  const [error, setError] = useState('')
  const update = (field: keyof Product, value: string | number) => setForm((current) => ({ ...current, [field]: value }))
  const save = () => {
    if (!form.name.trim() || !form.description.trim() || form.unitPrice < 0 || ![0, 9, 21].includes(Number(form.vat))) {
      setError('Vul naam, omschrijving, geldige prijs en btw-percentage in.')
      return
    }

    onSave({ ...form, companyId: activeCompanyId })
    setForm(emptyProduct())
    setError('')
  }

  return (
    <div className="content-grid">
      <section className="panel wide">
        <PanelHeader title="Producten en diensten" />
        <DataTable
          columns={['Naam', 'Categorie', 'Omschrijving', 'Prijs', 'BTW', 'Acties']}
          rows={products.map((product) => [
            product.name,
            product.category,
            product.description,
            eur.format(product.unitPrice),
            `${product.vat}%`,
            <div key={product.id} className="table-actions">
              <button className="table-link" onClick={() => setForm(product)}>Bewerken</button>
              <button className="table-link danger-link" onClick={() => onDelete(product.id)}>Verwijderen</button>
            </div>,
          ])}
        />
      </section>
      <section className="panel wide">
        <PanelHeader title={products.some((product) => product.id === form.id) ? 'Productregel bewerken' : 'Productregel toevoegen'} />
        {error && <p className="form-error">{error}</p>}
        <div className="form-grid">
          <label>Naam<input value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
          <label>Categorie<select value={form.category} onChange={(event) => update('category', event.target.value as Product['category'])}><option>Dienst</option><option>Product</option><option>Abonnement</option></select></label>
          <label>Omschrijving<input value={form.description} onChange={(event) => update('description', event.target.value)} /></label>
          <label>Prijs<input type="number" value={form.unitPrice} onChange={(event) => update('unitPrice', Number(event.target.value))} /></label>
          <label>BTW<select value={form.vat} onChange={(event) => update('vat', Number(event.target.value))}><option value={21}>21%</option><option value={9}>9%</option><option value={0}>0%</option></select></label>
        </div>
        <div className="invoice-actions">
          <button className="primary" onClick={save}>Productregel opslaan</button>
          <button className="ghost" onClick={() => setForm(emptyProduct())}>Nieuw formulier</button>
        </div>
      </section>
    </div>
  )
}

function Roles({
  members,
  canManage,
  invitePreview,
  onInvite,
  onRoleChange,
}: {
  members: TeamMember[]
  canManage: boolean
  invitePreview: { subject: string; body: string; link: string } | null
  onInvite: (member: Pick<TeamMember, 'name' | 'email' | 'role'>) => void
  onRoleChange: (memberId: string, role: CompanyRole) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<CompanyRole>('Financieel medewerker')
  const [error, setError] = useState('')

  const invite = () => {
    if (!name.trim() || !isValidEmail(email)) {
      setError('Vul een naam en geldig e-mailadres in.')
      return
    }

    onInvite({ name, email, role })
    setName('')
    setEmail('')
    setRole('Financieel medewerker')
    setError('')
  }

  return (
    <div className="content-grid">
      <section className="panel wide">
        <PanelHeader title="Rechten binnen team" />
        <DataTable columns={['Rol', 'Toegang']} rows={roles.map((role) => [role.name, role.access])} />
      </section>
      <section className="panel wide">
        <PanelHeader title="Team" />
        <DataTable
          columns={['Naam', 'E-mail', 'Rol', 'Status']}
          rows={members.map((member) => [
            member.name,
            member.email,
            <select key={member.id} value={member.role} disabled={!canManage} onChange={(event) => onRoleChange(member.id, event.target.value as CompanyRole)}>
              <option>Eigenaar</option>
              <option>Beheerder</option>
              <option>Financieel medewerker</option>
              <option>Lezer</option>
            </select>,
            <Status key={`${member.id}-status`} label={member.status} />,
          ])}
        />
      </section>
      <section className="panel wide">
        <PanelHeader title="Teamlid uitnodigen" />
        {!canManage && <p className="form-error">Alleen eigenaar en beheerder kunnen teamleden uitnodigen of rollen wijzigen.</p>}
        {error && <p className="form-error">{error}</p>}
        <div className="form-grid">
          <label>Naam<input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>E-mailadres<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Rol<select value={role} onChange={(event) => setRole(event.target.value as CompanyRole)}><option>Beheerder</option><option>Financieel medewerker</option><option>Lezer</option></select></label>
        </div>
        <button className="primary" disabled={!canManage} onClick={invite}>Uitnodiging klaarzetten</button>
        {invitePreview && (
          <div className="invite-preview">
            <span>Uitnodigingslink</span>
            <strong>{invitePreview.subject}</strong>
            <input readOnly value={invitePreview.link} />
            <textarea readOnly value={invitePreview.body} />
            <button className="ghost" onClick={() => void navigator.clipboard?.writeText(invitePreview.body)}>Conceptmail kopieren</button>
          </div>
        )}
      </section>
      <SettingsBlock icon={<ShieldCheck />} title="RBAC-principe" text="Elke actie wordt straks gecontroleerd op user_id, company_id en rol." />
      <SettingsBlock icon={<Users />} title="Teamstructuur" text="Een gebruiker kan meerdere bedrijven beheren met per bedrijf een andere rol." />
    </div>
  )
}

function DatabaseFoundation() {
  return (
    <div className="content-grid">
      <section className="panel wide">
        <PanelHeader title="Databasefundering" />
        <DataTable
          columns={['Tabel', 'Velden']}
          rows={Object.entries(foundationSchema).map(([table, fields]) => [
            table,
            fields.join(', '),
          ])}
        />
      </section>
      <section className="panel">
        <PanelHeader title="Tenant-scope" />
        <div className="data-model">
          {tenantScopedTables.map((table) => <span key={table}>{table}</span>)}
        </div>
      </section>
      <section className="panel">
        <PanelHeader title="Databaseregels" />
        <div className="suggestions">
          {foundationRules.map((rule) => <span key={rule}><Check size={16} /> {rule}</span>)}
        </div>
      </section>
    </div>
  )
}

function DesignSystem() {
  return (
    <div className="content-grid">
      <section className="panel wide">
        <PanelHeader title="Design-system basis" />
        <div className="design-grid">
          <div><span>Kleur</span><strong>Zakelijk blauw</strong><em className="swatch blue"></em></div>
          <div><span>Succes</span><strong>Groen</strong><em className="swatch green"></em></div>
          <div><span>Waarschuwing</span><strong>Amber</strong><em className="swatch amber"></em></div>
          <div><span>Radius</span><strong>8px max</strong><em className="radius-sample"></em></div>
        </div>
      </section>
      <section className="panel">
        <PanelHeader title="Knoppen" />
        <div className="component-row">
          <button className="primary">Primaire actie</button>
          <button className="ghost">Secundair</button>
          <button className="icon-button" aria-label="Zoeken"><Search size={18} /></button>
        </div>
      </section>
      <section className="panel">
        <PanelHeader title="Statuslabels" />
        <div className="component-row">
          <Status label="Concept" />
          <Status label="Verzonden" />
          <Status label="Betaald" />
        </div>
      </section>
    </div>
  )
}

function SettingsPage({
  activeCompany,
  settings,
  auditEvents,
  onExport,
  onReset,
  onSaveSettings,
}: {
  activeCompany: Company
  settings: CompanySettings
  auditEvents: AuditEvent[]
  onExport: () => void
  onReset: () => void
  onSaveSettings: (settings: CompanySettings) => void
}) {
  const [form, setForm] = useState(settings)
  const update = (field: keyof CompanySettings, value: string | number) => setForm((current) => ({ ...current, [field]: value }))

  return (
    <div className="content-grid">
      <SettingsBlock icon={<Building2 />} title="Bedrijfsgegevens" text={`${activeCompany.name}, ${activeCompany.city}, pakket ${activeCompany.plan}`} />
      <SettingsBlock icon={<ShieldCheck />} title="Gebruikers en rechten" text="Voorbereid op meerdere gebruikers, rollen en audit logs." />
      <SettingsBlock icon={<WalletCards />} title="Factuurinstellingen" text={`${settings.invoicePrefix}, ${settings.paymentTermDays} dagen, standaard ${settings.defaultVat}% BTW.`} />
      <SettingsBlock icon={<BriefcaseBusiness />} title="Administraties" text="Data blijft gekoppeld aan company_id en wordt lokaal persistent opgeslagen." />
      <section className="panel wide">
        <PanelHeader title="Bedrijfsinstellingen" />
        <div className="form-grid">
          <label>Standaard BTW<select value={form.defaultVat} onChange={(event) => update('defaultVat', Number(event.target.value))}><option value={21}>21%</option><option value={9}>9%</option><option value={0}>0%</option></select></label>
          <label>Betalingstermijn<input type="number" value={form.paymentTermDays} onChange={(event) => update('paymentTermDays', Number(event.target.value))} /></label>
          <label>Factuurprefix<input value={form.invoicePrefix} onChange={(event) => update('invoicePrefix', event.target.value)} /></label>
          <label>Offerteprefix<input value={form.quotePrefix} onChange={(event) => update('quotePrefix', event.target.value)} /></label>
          <label>Betalingskenmerk<input value={form.paymentReferencePrefix} onChange={(event) => update('paymentReferencePrefix', event.target.value)} /></label>
          <label className="span-2">Documentvoet<textarea value={form.documentFooter} onChange={(event) => update('documentFooter', event.target.value)} /></label>
        </div>
        <button className="primary" onClick={() => onSaveSettings(form)}>Instellingen opslaan</button>
      </section>
      <section className="panel wide">
        <PanelHeader title="Werkruimtebeheer" />
        <div className="workspace-tools">
          <button className="primary" onClick={onExport}>Export voorbereiden</button>
          <button className="ghost" onClick={onReset}>Demo-data herstellen</button>
        </div>
        <p className="helper-text">Exports worden in deze MVP lokaal klaargezet. In de backendfase wordt dit een echte download/API-export.</p>
      </section>
      <section className="panel wide">
        <PanelHeader title="Auditlog" />
        <DataTable
          columns={['Actie', 'Type', 'Tijd']}
          rows={auditEvents.slice(0, 8).map((event) => [
            event.action,
            event.entityType,
            new Date(event.createdAt).toLocaleString('nl-NL'),
          ])}
        />
      </section>
    </div>
  )
}

function SubscriptionPage({
  activeCompany,
  usage,
  canManage,
  onSelectPlan,
}: {
  activeCompany: Company
  usage: PlanUsage
  canManage: boolean
  onSelectPlan: (plan: CompanyPlan) => void
}) {
  const currentPlan = planByName(activeCompany.plan)
  const usageLabels: Record<PlanLimitKey, string> = {
    companies: 'Administraties',
    customers: 'Klanten',
    invoices: 'Facturen',
    quotes: 'Offertes',
    teamMembers: 'Teamleden',
  }

  return (
    <div className="content-grid">
      <section className="panel wide subscription-hero">
        <div>
          <p className="eyebrow">Account en abonnement</p>
          <h2>{activeCompany.name}</h2>
          <p>{currentPlan.audience}</p>
        </div>
        <div className="subscription-summary">
          <span>Huidig pakket</span>
          <strong>{currentPlan.name}</strong>
          <em>{currentPlan.price}</em>
        </div>
      </section>

      <section className="panel wide">
        <PanelHeader title="Gebruik deze maand" />
        <div className="usage-grid">
          {(Object.keys(usage) as PlanLimitKey[]).map((key) => {
            const limit = currentPlan.limits[key]
            const percentage = usagePercentage(usage[key], limit)
            return (
              <div className="usage-card" key={key}>
                <div>
                  <span>{usageLabels[key]}</span>
                  <strong>{usage[key]}{limit === null ? '' : ` / ${limit}`}</strong>
                </div>
                <div className="usage-bar"><span style={{ width: `${limit === null ? 100 : percentage}%` }} /></div>
                <small>{limit === null ? 'Onbeperkt binnen Enterprise' : `${percentage}% gebruikt`}</small>
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel wide">
        <PanelHeader title="Pakketten" />
        <div className="plan-grid">
          {planCatalog.map((plan) => (
            <article className={`plan-option ${plan.name === activeCompany.plan ? 'active' : ''}`} key={plan.name}>
              <span>{plan.name}</span>
              <strong>{plan.price}</strong>
              <p>{plan.audience}</p>
              <div className="suggestions">
                {plan.features.map((feature) => <span key={feature}><Check size={16} /> {feature}</span>)}
              </div>
              <button className={plan.name === activeCompany.plan ? 'ghost' : 'primary'} disabled={!canManage || plan.name === activeCompany.plan} onClick={() => onSelectPlan(plan.name)}>
                {plan.name === activeCompany.plan ? 'Actief pakket' : 'Pakket kiezen'}
              </button>
            </article>
          ))}
        </div>
        {!canManage && <p className="form-error">Alleen eigenaar en beheerder kunnen het pakket wijzigen.</p>}
      </section>

      <SettingsBlock icon={<WalletCards />} title="Facturatie" text={`${activeCompany.email || 'Geen facturatie-e-mail ingesteld'} - ${activeCompany.iban || 'Geen IBAN ingesteld'}`} />
      <SettingsBlock icon={<ShieldCheck />} title="Toegang" text={`Je rol binnen dit bedrijf is ${activeCompany.role}. Pakketwijzigingen worden gelogd in de auditlog.`} />
    </div>
  )
}

function AccountPage({
  activeCompany,
  members,
  onLogout,
  onNavigate,
}: {
  activeCompany: Company
  members: TeamMember[]
  onLogout: () => void
  onNavigate: (screen: Screen) => void
}) {
  const activeMembers = members.filter((member) => member.status === 'Actief')
  const invitedMembers = members.filter((member) => member.status === 'Uitgenodigd')

  return (
    <div className="content-grid">
      <section className="panel wide account-hero">
        <div>
          <p className="eyebrow">Profiel en toegang</p>
          <h2>{activeCompany.email || activeCompany.name}</h2>
          <p>Je werkt nu in {activeCompany.name} als {activeCompany.role}.</p>
        </div>
        <div className="account-actions">
          <button className="primary" onClick={() => onNavigate('roles')}>Team beheren</button>
          <button className="ghost" onClick={onLogout}>Uitloggen</button>
        </div>
      </section>

      <SettingsBlock icon={<Building2 />} title="Actieve administratie" text={`${activeCompany.name} - ${activeCompany.city || 'plaats nog niet ingevuld'} - ${activeCompany.plan}`} />
      <SettingsBlock icon={<ShieldCheck />} title="Rol en rechten" text={`${activeCompany.role}: acties in facturen, offertes, instellingen en teams worden hierop afgestemd.`} />
      <SettingsBlock icon={<Users />} title="Teamstatus" text={`${activeMembers.length} actief, ${invitedMembers.length} uitgenodigd.`} />
      <SettingsBlock icon={<Bell />} title="Sessiestatus" text="Supabase Auth houdt de sessie actief. Uitloggen wist de lokale sessie en sluit de werkruimte." />

      <section className="panel wide">
        <PanelHeader title="Toegangsoverzicht" action="Naar rollen" onAction={() => onNavigate('roles')} />
        <DataTable
          columns={['Naam', 'E-mail', 'Rol', 'Status']}
          rows={members.map((member) => [member.name, member.email, member.role, <Status key={member.id} label={member.status} />])}
        />
      </section>
    </div>
  )
}

function ReportsPage({
  metrics,
  invoices,
  quotes,
  customers,
  chartData,
  onNavigate,
}: {
  metrics: Record<string, number>
  invoices: Invoice[]
  quotes: Quote[]
  customers: Customer[]
  chartData: Array<{ month: string; omzet: number; winst: number }>
  onNavigate: (screen: Screen) => void
}) {
  const paid = invoices.filter((invoice) => invoice.status === 'Betaald')
  const open = invoices.filter((invoice) => invoice.status !== 'Betaald')
  const acceptedQuotes = quotes.filter((quote) => quote.status === 'Geaccepteerd')
  const conversion = quotes.length === 0 ? 0 : Math.round((acceptedQuotes.length / quotes.length) * 100)
  const topCustomers = [...customers].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const [selectedReportId, setSelectedReportId] = useState('profit-loss')
  const revenue = invoices.reduce((sum, invoice) => sum + invoice.amount - invoice.vat, 0)
  const vatTotal = invoices.reduce((sum, invoice) => sum + invoice.vat, 0)
  const operatingCosts = Math.round(revenue * 0.38)
  const result = revenue - operatingCosts
  const bankBalance = Math.max(0, metrics.profit - metrics.open)
  const assetsTotal = bankBalance + metrics.open + 3200
  const liabilitiesTotal = vatTotal + Math.max(0, assetsTotal - result - vatTotal)
  const customerRevenueRows = topCustomers.map((customer) => [customer.name, eur.format(customer.revenue), customer.city || 'Onbekend'])
  const unpaidRows = customers
    .map((customer) => {
      const customerInvoices = open.filter((invoice) => invoice.customerId === customer.id)
      const amount = customerInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)
      return [customer.name, String(customerInvoices.length), eur.format(amount)]
    })
    .filter((row) => row[1] !== '0')
  const reportDefinitions = [
    {
      id: 'profit-loss',
      category: 'Standaard rapporten',
      title: 'Winst-en-verliesrekening',
      value: eur.format(result),
      status: 'Realtime',
      description: 'Opbrengsten, geschatte kosten en resultaat op basis van verkoopdata.',
      rows: [['Opbrengsten', eur.format(revenue), 'Verkoop exclusief btw'], ['Kosten', eur.format(operatingCosts), 'MVP schatting tot inkoopboek actief is'], ['Resultaat', eur.format(result), 'Voorlopig resultaat']],
    },
    {
      id: 'balance',
      category: 'Standaard rapporten',
      title: 'Balans',
      value: eur.format(assetsTotal),
      status: 'Voorlopig',
      description: 'Activa, openstaande posten en verplichtingen uit de huidige werkruimte.',
      rows: [['Bank en kas', eur.format(bankBalance), 'Gebaseerd op betaalde facturen'], ['Debiteuren', eur.format(metrics.open), 'Nog te ontvangen'], ['Bedrijfsmiddelen', eur.format(3200), 'Handmatig te verfijnen'], ['Btw-schuld', eur.format(vatTotal), 'Verkoop-btw'], ['Balans totaal', eur.format(Math.max(assetsTotal, liabilitiesTotal)), 'Conceptbalans']],
    },
    {
      id: 'assets',
      category: 'Standaard rapporten',
      title: 'Bedrijfsmiddelen',
      value: eur.format(3200),
      status: 'Voorbereid',
      description: 'Register voor investeringen, afschrijving en KIA.',
      rows: [['Laptop en apparatuur', eur.format(1800), '36 maanden'], ['Software en inrichting', eur.format(1400), '12 maanden'], ['Afschrijving dit jaar', eur.format(940), 'Concept']],
    },
    {
      id: 'unpaid-by-customer',
      category: 'Standaard rapporten',
      title: 'Onbetaalde facturen per klant',
      value: eur.format(metrics.open),
      status: open.length > 0 ? 'Actie nodig' : 'Rustig',
      description: 'Debiteurenrapport met aantallen en bedragen per klant.',
      rows: unpaidRows.length ? unpaidRows : [['Geen openstaande posten', '0', eur.format(0)]],
    },
    {
      id: 'revenue-by-customer',
      category: 'Standaard rapporten',
      title: 'Omzet per klant',
      value: eur.format(topCustomers[0]?.revenue ?? 0),
      status: 'Realtime',
      description: 'Welke klanten dragen het meeste bij aan de omzet.',
      rows: customerRevenueRows,
    },
    {
      id: 'vat-return',
      category: 'Fiscaal',
      title: 'Btw-aangifte',
      value: eur.format(vatTotal),
      status: 'Voorbereiden',
      description: 'Rubrieken voor verkoop-btw. Voorbelasting volgt met bank/inkoopboek.',
      rows: [['1a Leveringen hoog tarief', eur.format(revenue), eur.format(vatTotal)], ['Voorbelasting', eur.format(0), 'Bank/inkoop nodig'], ['Te betalen', eur.format(vatTotal), 'Voorlopig']],
    },
    {
      id: 'icp',
      category: 'Fiscaal',
      title: 'Opgaaf ICP',
      value: eur.format(0),
      status: 'Geen EU-omzet',
      description: 'EU-leveringen per btw-nummer zodra klanten als EU-klant zijn gemarkeerd.',
      rows: [['EU-klanten', '0', 'Nog geen ICP-posten'], ['Totaal ICP', eur.format(0), 'Concept']],
    },
    {
      id: 'kia',
      category: 'Fiscaal',
      title: 'Kleinschaligheidsinvesteringsaftrek (KIA)',
      value: eur.format(3200),
      status: 'Voorbereid',
      description: 'Investeringsbasis voor KIA. Wordt definitief met bedrijfsmiddelenregister.',
      rows: [['Investeringsbedrag', eur.format(3200), 'Concept'], ['Mogelijke aftrek', 'Te bepalen', 'Fiscaal rapport nodig']],
    },
    {
      id: 'income-tax',
      category: 'Fiscaal',
      title: 'Aangifte inkomstenbelasting (IB)',
      value: eur.format(result),
      status: 'Voorbereid',
      description: 'Ondernemersresultaat als basis voor IB-aangifte.',
      rows: [['Winst uit onderneming', eur.format(result), 'Voorlopig'], ['Privé-correcties', 'Nog niet ingevuld', 'Boekhouding nodig'], ['IB-bijlagen', 'Voorbereid', 'Export volgt']],
    },
    {
      id: 'annual-accounts',
      category: 'Jaarafsluiting',
      title: 'Jaarrekening',
      value: eur.format(result),
      status: 'Concept',
      description: 'Jaarrekeningpakket met balans, winst-en-verlies en toelichting.',
      rows: [['Balans', 'Aanwezig', 'Concept'], ['Winst-en-verlies', 'Aanwezig', 'Concept'], ['Toelichting', 'Voorbereid', 'Aanvullen na bankkoppeling']],
    },
    {
      id: 'kvk-annual',
      category: 'Jaarafsluiting',
      title: 'KvK-jaarrekening',
      value: 'Micro',
      status: 'Concept',
      description: 'Publicatiestukken voor KvK, afhankelijk van rechtsvorm en grootteklasse.',
      rows: [['Grootteklasse', 'Micro/klein', 'Voorlopig'], ['Publicatiebalans', 'Voorbereid', 'Controle nodig'], ['XBRL/export', 'Later', 'Backendfase']],
    },
    {
      id: 'accruals',
      category: 'Jaarafsluiting',
      title: 'Overlopende posten',
      value: eur.format(0),
      status: 'Voorbereid',
      description: 'Nog te factureren, vooruitbetaalde kosten en overlopende omzet.',
      rows: [['Nog te factureren', eur.format(0), 'Geen posten'], ['Vooruitbetaalde kosten', eur.format(0), 'Bank/inkoop nodig'], ['Overlopende omzet', eur.format(0), 'Geen posten']],
    },
    {
      id: 'period-compare',
      category: 'Geavanceerde rapporten',
      title: 'Vergelijk opbrengsten en kosten van twee periodes',
      value: '+14%',
      status: 'Realtime',
      description: 'Vergelijk omzet en geschatte kosten per periode.',
      rows: chartData.slice(-3).map((row) => [row.month, eur.format(row.omzet), eur.format(Math.round(row.omzet * 0.38))]),
    },
    {
      id: 'balance-compare',
      category: 'Geavanceerde rapporten',
      title: 'Vergelijk balans van twee periodes',
      value: eur.format(assetsTotal),
      status: 'Voorbereid',
      description: 'Balansvergelijking zodra bankstanden en boekingen beschikbaar zijn.',
      rows: [['Huidige activa', eur.format(assetsTotal), 'Concept'], ['Vorige periode', eur.format(Math.max(0, assetsTotal - 2400)), 'Schatting'], ['Verschil', eur.format(2400), 'Voorlopig']],
    },
    {
      id: 'oss',
      category: 'Geavanceerde rapporten',
      title: 'EU-btw éénloketsysteem aangifte',
      value: eur.format(0),
      status: 'Geen OSS',
      description: 'OSS-aangifte voor EU-consumentenverkopen.',
      rows: [['EU-consumentenverkopen', eur.format(0), 'Niet gevonden'], ['OSS-landen', '0', 'Nog geen regels']],
    },
    {
      id: 'cashflow',
      category: 'Geavanceerde rapporten',
      title: 'Cashflow',
      value: eur.format(bankBalance),
      status: 'Bank nodig',
      description: 'Kasstroomprognose op basis van betaalde en openstaande facturen.',
      rows: [['Beginstand', eur.format(bankBalance), 'Concept'], ['Te ontvangen', eur.format(metrics.open), `${open.length} facturen`], ['Verwachte btw-afdracht', eur.format(vatTotal), 'Voorlopig']],
    },
    {
      id: 'recurring-revenue',
      category: 'Geavanceerde rapporten',
      title: 'Omzet uit periodieke facturen rapport',
      value: eur.format(invoices.filter((invoice) => invoice.items.some((item) => item.description.toLowerCase().includes('support'))).reduce((sum, invoice) => sum + invoice.amount, 0)),
      status: 'Voorbereid',
      description: 'Herkenning van terugkerende omzet uit factuurregels.',
      rows: invoices.filter((invoice) => invoice.items.some((item) => item.description.toLowerCase().includes('support'))).map((invoice) => [invoice.number, nameFor(invoice.customerId, customers), eur.format(invoice.amount)]),
    },
    {
      id: 'direct-debit',
      category: 'Geavanceerde rapporten',
      title: "Automatische incasso's",
      value: '0 mandaten',
      status: 'Bank nodig',
      description: 'SEPA-incasso-overzicht zodra mandaten en bankkoppeling actief zijn.',
      rows: [['Mandaten', '0', 'Nog niet ingesteld'], ['Incassobatches', '0', 'Bankkoppeling nodig']],
    },
    {
      id: 'margin-scheme',
      category: 'Geavanceerde rapporten',
      title: 'Margeregeling',
      value: eur.format(0),
      status: 'Niet actief',
      description: 'Voor margegoederen met verkoop minus inkoop als btw-basis.',
      rows: [['Margegoederen', '0', 'Niet gevonden'], ['Marge-btw', eur.format(0), 'Niet actief']],
    },
    {
      id: 'travel-scheme',
      category: 'Geavanceerde rapporten',
      title: 'Reisbureauregeling',
      value: eur.format(0),
      status: 'Niet actief',
      description: 'Speciale regeling voor reisprestaties.',
      rows: [['Reisprestaties', '0', 'Niet gevonden'], ['Btw-basis', eur.format(0), 'Niet actief']],
    },
  ]
  const selectedReport = reportDefinitions.find((report) => report.id === selectedReportId) ?? reportDefinitions[0]
  const reportCategories = [...new Set(reportDefinitions.map((report) => report.category))]
  const downloadSelectedReport = () => {
    const rows = [
      ['Rapport', selectedReport.title],
      ['Status', selectedReport.status],
      ['Waarde', selectedReport.value],
      [],
      ['Regel', 'Waarde', 'Toelichting'],
      ...selectedReport.rows,
    ]
    downloadCsv(`${selectedReport.title}.csv`, rows)
  }
  const aiInsights = [
    metrics.open > 0 ? `Er staat ${eur.format(metrics.open)} open. Verstuur herinneringen voor vervallen facturen.` : 'Alle facturen zijn betaald. Cashflow is op orde.',
    conversion < 50 && quotes.length > 1 ? 'De offerteconversie kan hoger. Volg open offertes binnen 48 uur op.' : 'Offertes presteren stabiel. Zet geaccepteerde offertes sneller om naar factuur.',
    metrics.vatDue > 0 ? `Reserveer minimaal ${eur.format(metrics.vatDue)} voor btw en controleer straks voorbelasting via bank/inkoop.` : 'Er is nog geen btw-reservering voor deze maand.',
  ]

  return (
    <div className="content-grid">
      <section className="panel wide report-hero">
        <div>
          <p className="eyebrow">Rapportages</p>
          <h2>Rapporten genereren zonder zoekwerk</h2>
          <p>Brenqo maakt standaardrapporten, fiscale rapporten en geavanceerde analyses vanuit je verkoopdata. Bank- en inkoopdata klikken straks vanzelf vast in dezelfde rapporten.</p>
        </div>
        <div className="report-score">
          <span>Gezondheid</span>
          <strong>{metrics.overdue > 0 ? 'Let op' : 'Sterk'}</strong>
          <em>{paid.length} betaalde facturen</em>
        </div>
      </section>

      <div className="kpi-grid content-grid">
        <Metric label="Omzet deze maand" value={eur.format(metrics.revenue)} trend="facturen in huidige maand" />
        <Metric label="Nog te ontvangen" value={eur.format(metrics.open)} trend={`${open.length} facturen`} />
        <Metric label="Btw reserveren" value={eur.format(metrics.vatDue)} trend="op basis van verkoop" />
        <Metric label="Offerteconversie" value={`${conversion}%`} trend={`${acceptedQuotes.length} gewonnen`} />
      </div>

      <section className="panel wide">
        <PanelHeader title="Omzet en betaald resultaat" action="Open facturen" onAction={() => onNavigate('invoices')} />
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="reportRevenue" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#1877f2" stopOpacity={0.26} />
                  <stop offset="95%" stopColor="#1877f2" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="reportProfit" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#13a36f" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#13a36f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => eur.format(Number(value))} />
              <Area dataKey="omzet" stroke="#1877f2" fill="url(#reportRevenue)" strokeWidth={3} />
              <Area dataKey="winst" stroke="#13a36f" fill="url(#reportProfit)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel wide">
        <PanelHeader title="Rapportgenerator" action="Download CSV" onAction={downloadSelectedReport} />
        <div className="report-workbench">
          <div className="report-library">
            {reportCategories.map((category) => (
              <div key={category}>
                <h3>{category}</h3>
                <div className="report-list">
                  {reportDefinitions.filter((report) => report.category === category).map((report) => (
                    <button className={selectedReport.id === report.id ? 'active' : ''} key={report.id} onClick={() => setSelectedReportId(report.id)}>
                      <span><strong>{report.title}</strong><small>{report.description}</small></span>
                      <em>{report.value}</em>
                      <Status label={report.status} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <aside className="report-preview">
            <span className="pill">{selectedReport.category}</span>
            <h3>{selectedReport.title}</h3>
            <strong>{selectedReport.value}</strong>
            <p>{selectedReport.description}</p>
            <DataTable columns={['Regel', 'Waarde', 'Toelichting']} rows={selectedReport.rows} />
            <div className="report-actions">
              <button className="primary" onClick={downloadSelectedReport}>Genereer CSV</button>
              <button className="ghost" onClick={() => selectedReport.id.includes('vat') ? onNavigate('vat') : selectedReport.id.includes('unpaid') ? onNavigate('invoices') : onNavigate('bank')}>
                {selectedReport.status.includes('Bank') ? 'Open bankmodule' : 'Open brondata'}
              </button>
            </div>
          </aside>
        </div>
      </section>

      <section className="panel">
        <PanelHeader title="AI samenvatting" />
        <div className="suggestions">
          {aiInsights.map((insight) => <span key={insight}><Sparkles size={16} /> {insight}</span>)}
        </div>
      </section>

      <section className="panel wide">
        <PanelHeader title="Klantenwaarde" action="Open klanten" onAction={() => onNavigate('customers')} />
        <DataTable
          columns={['Klant', 'Omzet', 'Status']}
          rows={topCustomers.map((customer) => [
            customer.name,
            eur.format(customer.revenue),
            <Status key={customer.id} label={customer.revenue > 3000 ? 'Strategisch' : 'Actief'} />,
          ])}
        />
      </section>
    </div>
  )
}

function VatPage({ metrics, invoices, onNavigate }: { metrics: Record<string, number>; invoices: Invoice[]; onNavigate: (screen: Screen) => void }) {
  const monthInvoices = invoices.filter((invoice) => invoice.date.slice(0, 7) === todayIso().slice(0, 7))
  const checks = [
    ['Facturen gecontroleerd', `${monthInvoices.length} facturen in deze maand`, true],
    ['Btw berekend', eur.format(metrics.vatDue), metrics.vatDue >= 0],
    ['Concepten controleren', `${invoices.filter((invoice) => invoice.status === 'Concept').length} concepten`, invoices.every((invoice) => invoice.status !== 'Concept')],
    ['Vervallen facturen', `${invoices.filter((invoice) => invoice.status === 'Verlopen').length} verlopen`, metrics.overdue === 0],
  ] as const

  return (
    <div className="content-grid">
      <section className="panel wide report-hero">
        <div>
          <p className="eyebrow">BTW</p>
          <h2>Btw voorbereiden zonder zoekwerk</h2>
          <p>Controleer verkoopfacturen, concepten en open risico's voordat je aangifte doet.</p>
        </div>
        <div className="report-score"><span>Te reserveren</span><strong>{eur.format(metrics.vatDue)}</strong><em>huidige maand</em></div>
      </section>
      <section className="panel">
        <PanelHeader title="Controlelijst" />
        <div className="checklist">
          {checks.map(([title, text, ok]) => <span key={title} className={ok ? 'ok' : 'attention'}><Check size={16} /><strong>{title}</strong><small>{text}</small></span>)}
        </div>
      </section>
      <section className="panel">
        <PanelHeader title="AI uitleg" />
        <p className="muted-copy">Brenqo gebruikt de factuurregels als basis. Zodra boekingen en banktransacties actief zijn, vergelijken we ook betalingen, bonnetjes en voorbelasting.</p>
        <button className="primary" onClick={() => onNavigate('reports')}>Bekijk rapportages</button>
      </section>
    </div>
  )
}

function BankPage({ invoices, onNavigate }: { invoices: Invoice[]; onNavigate: (screen: Screen) => void }) {
  const openInvoices = invoices.filter((invoice) => invoice.status !== 'Betaald')
  const [importMessage, setImportMessage] = useState('')
  const bankProviders = [
    { name: 'Rabobank', status: 'Klaar voor PSD2', description: 'Rabobank zakelijke rekening via PSD2-provider koppelen.' },
    { name: 'ING', status: 'Klaar voor PSD2', description: 'Dagelijkse transacties ophalen en matchen.' },
    { name: 'bunq', status: 'API-ready', description: 'Realtime transacties via API zodra sleutel is ingesteld.' },
    { name: 'Knab', status: 'Import klaar', description: 'CSV, CAMT.053 of MT940 importeren.' },
  ]
  const suggestedTransactions = openInvoices.slice(0, 5).map((invoice, index) => ({
    date: index === 0 ? todayIso() : `2026-07-${String(4 + index).padStart(2, '0')}`,
    description: `Bijschrijving ${nameFor(invoice.customerId)} ${invoice.number}`,
    amount: invoice.amount,
    match: invoice.number,
    confidence: invoice.amount > 1000 ? 'Hoog' : 'Middel',
  }))
  const bankChecks = [
    ['Bankrekening gekozen', 'Rabobank zakelijke rekening voorbereid', true],
    ['Importformaat', 'CSV, CAMT.053 en MT940 workflow klaar', true],
    ['Automatisch matchen', `${suggestedTransactions.length} voorstellen op open facturen`, suggestedTransactions.length > 0],
    ['PSD2-provider', 'Mollie/GoCardless/EnableBanking keuze nog maken', false],
  ] as const

  return (
    <div className="content-grid">
      <section className="panel wide report-hero">
        <div>
          <p className="eyebrow">Bank</p>
          <h2>Banktransacties koppelen en automatisch matchen</h2>
          <p>De workflow is ingericht voor PSD2-koppelingen en handmatige import. Binnenkomende betalingen worden gematcht aan open facturen op bedrag, klantnaam en factuurnummer.</p>
        </div>
        <div className="report-score"><span>Te matchen</span><strong>{openInvoices.length}</strong><em>open facturen</em></div>
      </section>

      <section className="panel wide">
        <PanelHeader title="Banken en koppelingen" />
        <div className="bank-grid">
          {bankProviders.map((provider) => (
            <article key={provider.name} className="bank-card">
              <strong>{provider.name}</strong>
              <Status label={provider.status} />
              <p>{provider.description}</p>
              <button className="ghost" onClick={() => onNavigate('settings')}>Koppeling instellen</button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelHeader title="Import en controle" />
        <div className="checklist">
          {bankChecks.map(([title, text, ok]) => <span key={title} className={ok ? 'ok' : 'attention'}><Check size={16} /><strong>{title}</strong><small>{text}</small></span>)}
        </div>
      </section>

      <section className="panel">
        <PanelHeader title="Volgende bankactie" />
        <div className="upload-zone">
          <WalletCards size={22} />
          <strong>Upload bankbestand</strong>
          <span>CSV, CAMT.053 of MT940</span>
          <button className="primary" onClick={() => setImportMessage('Importwizard staat klaar. Kies straks een CSV, CAMT.053 of MT940-bestand om transacties te herkennen.')}>Import voorbereiden</button>
        </div>
        {importMessage && <p className="success-note">{importMessage}</p>}
        <p className="helper-text">Echte bankconnectie vraagt nog een PSD2-providerkeuze en API-credentials. De matchlogica en UI zijn hierop voorbereid.</p>
      </section>

      <section className="panel wide">
        <PanelHeader title="Automatische matchvoorstellen" action="Open facturen" onAction={() => onNavigate('invoices')} />
        <DataTable
          columns={['Datum', 'Omschrijving', 'Bedrag', 'Match', 'Zekerheid']}
          rows={suggestedTransactions.map((transaction) => [
            transaction.date,
            transaction.description,
            eur.format(transaction.amount),
            transaction.match,
            <Status key={transaction.match} label={transaction.confidence} />,
          ])}
        />
      </section>

      <section className="panel wide">
        <PanelHeader title="Open facturen zonder betaling" />
        <DataTable
          columns={['Factuur', 'Bedrag', 'Status', 'Voorstel']}
          rows={openInvoices.map((invoice) => [invoice.number, eur.format(invoice.amount), <Status key={invoice.id} label={invoice.status} />, 'Match zodra transactie binnenkomt'])}
        />
      </section>
    </div>
  )
}

function AccountingPage({ invoices, auditEvents, onNavigate }: { invoices: Invoice[]; auditEvents: AuditEvent[]; onNavigate: (screen: Screen) => void }) {
  const processed = invoices.filter((invoice) => invoice.status === 'Betaald').length
  return (
    <div className="content-grid">
      <section className="panel wide report-hero">
        <div>
          <p className="eyebrow">Boekhouding</p>
          <h2>Van administratie naar automatische controle</h2>
          <p>Boekhouding in Brenqo wordt taakgericht: wat is verwerkt, wat mist nog en welke actie lost het op?</p>
        </div>
        <div className="report-score"><span>Verwerkt</span><strong>{processed}</strong><em>betaalde facturen</em></div>
      </section>
      <SettingsBlock icon={<BookOpen />} title="Verkoopboek" text={`${invoices.length} verkoopfacturen beschikbaar voor rapportages en btw.`} />
      <SettingsBlock icon={<ShieldCheck />} title="Controlepad" text={`${auditEvents.length} acties in de auditlog voor deze werkruimte.`} />
      <section className="panel wide">
        <PanelHeader title="Laatste boekhoudacties" action="Naar rapportages" onAction={() => onNavigate('reports')} />
        <DataTable columns={['Actie', 'Type', 'Datum']} rows={auditEvents.slice(0, 8).map((event) => [event.action, event.entityType, new Date(event.createdAt).toLocaleString('nl-NL')])} />
      </section>
    </div>
  )
}

function DocumentsPage({
  invoices,
  quotes,
  incomingInvoices,
  onUpload,
  onStatusChange,
  onDelete,
  onNavigate,
}: {
  invoices: Invoice[]
  quotes: Quote[]
  incomingInvoices: IncomingInvoice[]
  onUpload: (files: File[]) => void
  onStatusChange: (invoiceId: string, status: IncomingInvoiceStatus) => void
  onDelete: (invoiceId: string) => void
  onNavigate: (screen: Screen) => void
}) {
  const [selectedIncomingInvoiceId, setSelectedIncomingInvoiceId] = useState<string | null>(null)
  const selectedIncomingInvoice = incomingInvoices.find((invoice) => invoice.id === selectedIncomingInvoiceId)
  const readyToBook = incomingInvoices.filter((invoice) => invoice.status === 'Klaar om te boeken').length
  const needsReview = incomingInvoices.filter((invoice) => invoice.status === 'Controle nodig').length
  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    onUpload(Array.from(event.target.files ?? []))
    event.target.value = ''
  }
  const openReview = (invoice: IncomingInvoice) => {
    setSelectedIncomingInvoiceId(invoice.id)
    if (invoice.status === 'Controle nodig' || invoice.status === 'Nieuw' || invoice.status === 'Herkennen') {
      onStatusChange(invoice.id, 'Klaar om te boeken')
    }
  }

  return (
    <div className="content-grid">
      <section className="panel wide report-hero">
        <div>
          <p className="eyebrow">Documenten</p>
          <h2>Upload, herken en verwerk inkomende facturen</h2>
          <p>Bonnen en inkoopfacturen komen binnen in een controleflow. Brenqo maakt alvast een boekingsvoorstel met leverancier, datum, btw en bedrag.</p>
        </div>
        <div className="report-score"><span>Te controleren</span><strong>{needsReview}</strong><em>{readyToBook} klaar om te boeken</em></div>
      </section>
      <SettingsBlock icon={<FileText />} title="Facturen" text={`${invoices.length} facturen met server-side PDF-download en verzenden vanuit Brenqo.`} />
      <SettingsBlock icon={<FileCheck2 />} title="Offertes" text={`${quotes.length} offertes klaar om naar factuur om te zetten.`} />
      <SettingsBlock icon={<Sparkles />} title="Inkoopherkenning" text={`${incomingInvoices.length} inkomende documenten in de verwerkingsflow.`} />
      <section className="panel incoming-upload-panel">
        <PanelHeader title="Inkomende factuur uploaden" />
        <label className="upload-zone document-upload">
          <FilePlus2 size={32} />
          <strong>Sleep of selecteer een factuur</strong>
          <span>PDF, JPG, PNG of WebP. Brenqo zet hem direct klaar voor controle.</span>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" multiple onChange={handleUpload} />
        </label>
      </section>
      <section className="panel incoming-ai-panel">
        <PanelHeader title="Automatische verwerking" />
        <div className="recognition-steps">
          <span><Check size={18} /> Bestand opslaan in de werkruimte</span>
          <span><Sparkles size={18} /> Leverancier, bedrag en btw herkennen</span>
          <span><Check size={18} /> Boekingsvoorstel klaarzetten</span>
          <span><ArrowRight size={18} /> Later koppelen aan banktransactie en btw-aangifte</span>
        </div>
      </section>
      {selectedIncomingInvoice && (
        <section className="panel wide incoming-review-panel">
          <PanelHeader title="Controle inkomende factuur" action="Sluiten" onAction={() => setSelectedIncomingInvoiceId(null)} />
          <div className="incoming-review-grid">
            <div className="incoming-document-preview">
              <FileText size={34} />
              <strong>{selectedIncomingInvoice.fileName}</strong>
              <span>Herkenning {selectedIncomingInvoice.confidence}% zeker</span>
              <Status label={selectedIncomingInvoice.status} />
            </div>
            <div className="incoming-fields">
              <span>Leverancier<strong>{selectedIncomingInvoice.supplier}</strong></span>
              <span>Factuurnummer<strong>{selectedIncomingInvoice.invoiceNumber}</strong></span>
              <span>Factuurdatum<strong>{selectedIncomingInvoice.invoiceDate}</strong></span>
              <span>Vervaldatum<strong>{selectedIncomingInvoice.dueDate}</strong></span>
              <span>Bedrag incl. btw<strong>{eur.format(selectedIncomingInvoice.amount)}</strong></span>
              <span>BTW<strong>{eur.format(selectedIncomingInvoice.vat)}</strong></span>
              <span>Categorie<strong>{selectedIncomingInvoice.category}</strong></span>
            </div>
            <div className="incoming-booking-card">
              <p className="eyebrow">Boekingsvoorstel</p>
              <h3>{selectedIncomingInvoice.category}</h3>
              <p>Boek als inkoopfactuur, reserveer {eur.format(selectedIncomingInvoice.vat)} btw en match later automatisch met de banktransactie.</p>
              <div className="invoice-actions">
                <button className="primary" onClick={() => onStatusChange(selectedIncomingInvoice.id, 'Geboekt')}>Boeking opslaan</button>
                <button className="ghost" onClick={() => onStatusChange(selectedIncomingInvoice.id, 'Controle nodig')}>Terug naar controle</button>
              </div>
            </div>
          </div>
        </section>
      )}
      <section className="panel wide">
        <PanelHeader title="Inkomende facturen" action="Naar boekhouding" onAction={() => onNavigate('accounting')} />
        <DataTable
          columns={['Document', 'Leverancier', 'Factuurdatum', 'Bedrag', 'BTW', 'Zekerheid', 'Status', 'Acties']}
          rows={incomingInvoices.map((invoice) => [
            <span key={`${invoice.id}-document`} className="stacked-cell"><strong>{invoice.fileName}</strong><small>{invoice.invoiceNumber}</small></span>,
            invoice.supplier,
            invoice.invoiceDate,
            eur.format(invoice.amount),
            eur.format(invoice.vat),
            `${invoice.confidence}%`,
            <Status key={`${invoice.id}-status`} label={invoice.status} />,
            <div key={`${invoice.id}-actions`} className="table-actions">
              <button className="table-link" onClick={() => openReview(invoice)}>Controleren</button>
              <button className="table-link" onClick={() => { setSelectedIncomingInvoiceId(invoice.id); onStatusChange(invoice.id, 'Geboekt') }}>Boeken</button>
              <button className="table-link danger" onClick={() => { if (selectedIncomingInvoiceId === invoice.id) setSelectedIncomingInvoiceId(null); onDelete(invoice.id) }}>Verwijderen</button>
            </div>,
          ])}
        />
      </section>
    </div>
  )
}

function TasksPage({ invoices, quotes, customers, onNavigate }: { invoices: Invoice[]; quotes: Quote[]; customers: Customer[]; onNavigate: (screen: Screen) => void }) {
  const tasks = [
    { title: 'Vervallen facturen opvolgen', count: invoices.filter((invoice) => invoice.status === 'Verlopen').length, screen: 'invoices' as Screen },
    { title: 'Conceptfacturen afronden', count: invoices.filter((invoice) => invoice.status === 'Concept').length, screen: 'invoices' as Screen },
    { title: 'Open offertes opvolgen', count: quotes.filter((quote) => quote.status === 'Verzonden').length, screen: 'quotes' as Screen },
    { title: 'Klantgegevens verrijken', count: customers.filter((customer) => !customer.vat || !customer.chamber).length, screen: 'customers' as Screen },
  ]
  return (
    <section className="panel wide">
      <PanelHeader title="Vandaag" />
      <div className="task-board">
        {tasks.map((task) => (
          <button key={task.title} onClick={() => onNavigate(task.screen)}>
            <span>{task.title}</span>
            <strong>{task.count}</strong>
            <small>{task.count === 0 ? 'Geen actie nodig' : 'Openen'}</small>
          </button>
        ))}
      </div>
    </section>
  )
}

function AiAssistantPage({ metrics, invoices, quotes, customers, onNavigate }: { metrics: Record<string, number>; invoices: Invoice[]; quotes: Quote[]; customers: Customer[]; onNavigate: (screen: Screen) => void }) {
  const prompts = [
    `Vat mijn omzet samen: ${eur.format(metrics.revenue)} deze maand.`,
    `Welke facturen moet ik opvolgen? ${invoices.filter((invoice) => invoice.status !== 'Betaald').length} staan open.`,
    `Welke offertes verdienen aandacht? ${quotes.filter((quote) => quote.status === 'Verzonden').length} zijn verzonden.`,
    `Welke klanten leveren de meeste waarde? ${customers.length} klanten beschikbaar.`,
  ]
  return (
    <div className="content-grid">
      <section className="panel wide report-hero">
        <div>
          <p className="eyebrow">AI assistent</p>
          <h2>Geen losse AI-knop, maar hulp in elke workflow</h2>
          <p>Deze assistent laat zien welke vragen Brenqo straks direct kan beantwoorden vanuit je eigen administratie.</p>
        </div>
        <button className="primary" onClick={() => onNavigate('reports')}>Open rapportages</button>
      </section>
      <section className="panel wide">
        <PanelHeader title="Slimme vragen" />
        <div className="prompt-grid">
          {prompts.map((prompt) => <button key={prompt}><Sparkles size={16} /> {prompt}</button>)}
        </div>
      </section>
    </div>
  )
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">B</div>
      <div><strong>Brenqo</strong><span>Business platform</span></div>
    </div>
  )
}

function Metric({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong>{trend && <em>{trend}</em>}</article>
}

function PanelHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="panel-header"><h2>{title}</h2>{action && <button className="primary" onClick={onAction}>{action}</button>}</div>
}

function EmptyState({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return (
    <div className="empty-state">
      <Sparkles size={22} />
      <strong>{title}</strong>
      <p>{text}</p>
      <button className="primary" onClick={onAction}>{action}</button>
    </div>
  )
}

function DataTable({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="empty-cell" colSpan={columns.length}>Geen resultaten binnen deze administratie.</td>
            </tr>
          )}
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => <td key={cellIndex} data-label={columns[cellIndex]}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Status({ label }: { label: string }) {
  return <span className={`status ${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</span>
}

function SettingsBlock({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <section className="settings-block">{icon}<h2>{title}</h2><p>{text}</p></section>
}

function updateRow(
  rows: InvoiceRow[],
  onRowsChange: (rows: InvoiceRow[]) => void,
  index: number,
  field: 'description' | 'quantity' | 'price' | 'vat',
  value: string | number,
) {
  onRowsChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)))
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function createIncomingInvoiceDraft(file: File, companyId: string): IncomingInvoice {
  const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  const supplier = cleanName.split(/\s+/).slice(0, 3).join(' ') || 'Onbekende leverancier'
  const baseAmount = Math.max(24.2, Math.round(((file.size % 180000) / 100 + 86) * 100) / 100)
  const amount = Math.round(baseAmount * 100) / 100
  const vat = Math.round((amount - amount / 1.21) * 100) / 100
  const invoiceDate = new Date(file.lastModified || Date.now()).toISOString().slice(0, 10)

  return {
    id: createRecordId('incoming'),
    companyId,
    fileName: file.name,
    uploadedAt: new Date().toISOString(),
    supplier,
    invoiceNumber: `INK-${todayIso().slice(0, 4)}-${String(file.size % 10000).padStart(4, '0')}`,
    invoiceDate,
    dueDate: addDaysFromIso(invoiceDate, 30),
    amount,
    vat,
    category: 'Inkoopkosten',
    confidence: Math.min(96, 74 + (file.name.length % 19)),
    status: 'Controle nodig',
  }
}

function addDaysFromIso(date: string, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next.toISOString().slice(0, 10)
}

function addDaysIso(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function buildMonthlyInvoiceData(sourceInvoices: Invoice[]) {
  const formatter = new Intl.DateTimeFormat('nl-NL', { month: 'short' })
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - (5 - index))
    const key = date.toISOString().slice(0, 7)
    const monthInvoices = sourceInvoices.filter((invoice) => invoice.date.slice(0, 7) === key)
    const omzet = monthInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)
    const winst = monthInvoices.filter((invoice) => invoice.status === 'Betaald').reduce((sum, invoice) => sum + invoice.amount, 0)

    return {
      month: formatter.format(date),
      omzet,
      winst,
    }
  })
}

function defaultSettingsFor(companyId: string): CompanySettings {
  return {
    companyId,
    defaultVat: 21,
    paymentTermDays: 14,
    invoicePrefix: '2026',
    quotePrefix: 'OFF-2026',
    paymentReferencePrefix: 'Factuur',
    documentFooter: 'Bedankt voor de samenwerking. Vragen? Reageer op deze factuurmail.',
  }
}

function downloadHtml(filename: string, html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.toLowerCase().replaceAll(/\s+/g, '-')
  link.click()
  window.URL.revokeObjectURL(url)
}

function nameFor(customerId: string, sourceCustomers: Customer[] = customers) {
  return sourceCustomers.find((customer) => customer.id === customerId)?.name ?? 'Onbekende klant'
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function includesSearch(values: string[], searchTerm: string) {
  const search = normalize(searchTerm)
  return !search || values.some((value) => normalize(value).includes(search))
}

function customerMatches(customer: Customer, searchTerm: string) {
  return includesSearch([
    customer.name,
    customer.contact,
    customer.email,
    customer.phone,
    customer.city,
    customer.vat,
    customer.chamber,
  ], searchTerm)
}

function invoiceMatches(invoice: Invoice, sourceCustomers: Customer[], searchTerm: string) {
  return includesSearch([
    invoice.number,
    invoice.status,
    invoice.date,
    invoice.due,
    nameFor(invoice.customerId, sourceCustomers),
    ...invoice.items.map((item) => item.description),
  ], searchTerm)
}

function quoteMatches(quote: Quote, sourceCustomers: Customer[], searchTerm: string) {
  return includesSearch([
    quote.number,
    quote.status,
    quote.validUntil,
    nameFor(quote.customerId, sourceCustomers),
    ...quote.items.map((item) => item.description),
  ], searchTerm)
}

function productMatches(product: Product, searchTerm: string) {
  return includesSearch([
    product.name,
    product.description,
    product.category,
    String(product.unitPrice),
    String(product.vat),
  ], searchTerm)
}

function titleFor(screen: Screen) {
  const titles: Record<Screen, string> = {
    login: 'Inloggen',
    'password-reset': 'Wachtwoord herstellen',
    onboarding: 'Onboarding',
    dashboard: 'Werkruimte',
    customers: 'Klanten',
    'customer-form': 'Klant toevoegen',
    'customer-detail': 'Klant detail',
    invoices: 'Facturen',
    'invoice-create': 'Factuur aanmaken',
    'invoice-edit': 'Factuur bewerken',
    'invoice-detail': 'Factuur detail',
    quotes: 'Offertes',
    'quote-create': 'Offerte aanmaken',
    'quote-edit': 'Offerte bewerken',
    'quote-detail': 'Offerte detail',
    companies: 'Werkruimtes',
    'company-form': 'Bedrijf beheren',
    roles: 'Team',
    database: 'Database',
    'design-system': 'Design system',
    products: 'Producten en diensten',
    accounting: 'Boekhouding',
    bank: 'Banktransacties',
    documents: 'Bonnen en documenten',
    vat: 'BTW-dashboard',
    reports: 'Rapportages',
    tasks: 'Taken',
    ai: 'AI Assistent',
    account: 'Account',
    settings: 'Instellingen',
    subscription: 'Abonnement',
  }
  return titles[screen]
}

export default App
