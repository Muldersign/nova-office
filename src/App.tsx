import { type ReactNode, useEffect, useMemo, useState } from 'react'
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
  Download,
  FileCheck2,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogIn,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { calculateTotals, nextDocumentNumber, validateRequiredCustomer } from './foundation/business'
import { foundationRules, foundationSchema, tenantScopedTables } from './foundation/database'
import { createPrintableDocumentHtml } from './foundation/documents'
import './App.css'

type Screen =
  | 'login'
  | 'onboarding'
  | 'dashboard'
  | 'customers'
  | 'customer-form'
  | 'customer-detail'
  | 'invoices'
  | 'invoice-create'
  | 'invoice-detail'
  | 'quotes'
  | 'quote-create'
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
  | 'subscription'

type InvoiceStatus = 'Concept' | 'Verzonden' | 'Betaald' | 'Verlopen'
type QuoteStatus = 'Concept' | 'Verzonden' | 'Geaccepteerd' | 'Afgewezen'
type CompanyRole = 'Eigenaar' | 'Beheerder' | 'Financieel medewerker' | 'Lezer'
type CompanyPlan = 'NOVA Start' | 'NOVA ZZP' | 'NOVA MKB' | 'NOVA Enterprise'

type Company = {
  id: string
  name: string
  role: CompanyRole
  plan: CompanyPlan
  chamber: string
  vat: string
  city: string
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

const companyId = 'comp_nova_demo'

const companies: Company[] = [
  {
    id: 'comp_nova_demo',
    name: 'NOVA Demo BV',
    role: 'Eigenaar',
    plan: 'NOVA Start',
    chamber: '87124490',
    vat: 'NL862145901B01',
    city: 'Amsterdam',
  },
  {
    id: 'comp_orbit_studio',
    name: 'Orbit Studio VOF',
    role: 'Beheerder',
    plan: 'NOVA Start',
    chamber: '63091244',
    vat: 'NL809912344B01',
    city: 'Den Haag',
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
    companyId: 'comp_orbit_studio',
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
    companyId: 'comp_orbit_studio',
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
    items: [{ description: 'Implementatie NOVA workflow', quantity: 1, price: 5289, vat: 21 }],
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
    companyId: 'comp_orbit_studio',
    customerId: 'cus_04',
    number: 'OFF-2026-012',
    amount: 3200,
    vat: 555,
    status: 'Concept',
    validUntil: '2026-07-28',
    items: [{ description: 'Merkpakket start', quantity: 1, price: 2645, vat: 21 }],
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
    companyId: 'comp_orbit_studio',
    action: 'Factuur 2026-0031 verzonden naar Helder Merkadvies',
    entityType: 'invoice',
    entityId: 'inv_05',
    createdAt: '2026-07-02T11:05:00.000Z',
  },
]

const monthlyData = [
  { month: 'Jan', omzet: 18400, kosten: 9200, winst: 9200 },
  { month: 'Feb', omzet: 21300, kosten: 9800, winst: 11500 },
  { month: 'Mrt', omzet: 19800, kosten: 10200, winst: 9600 },
  { month: 'Apr', omzet: 24600, kosten: 11100, winst: 13500 },
  { month: 'Mei', omzet: 22900, kosten: 10400, winst: 12500 },
  { month: 'Jun', omzet: 27100, kosten: 11900, winst: 15200 },
  { month: 'Jul', omzet: 15960, kosten: 6080, winst: 9880 },
]

const navItems = [
  ['dashboard', LayoutDashboard, 'Dashboard'],
  ['customers', Users, 'Klanten'],
  ['invoices', FileText, 'Facturen'],
  ['quotes', FileCheck2, 'Offertes'],
  ['companies', Building2, 'Bedrijven'],
  ['roles', ShieldCheck, 'Rollen'],
  ['database', BookOpen, 'Database'],
  ['design-system', Package, 'Design system'],
  ['settings', Settings, 'Instellingen'],
] as const

const eur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })
const sessionKeys = {
  authenticated: 'nova.authenticated',
  onboarded: 'nova.onboarded',
  activeCompanyId: 'nova.activeCompanyId',
} as const
const workspaceVersion = '2026-07-03-1'
const workspaceKeys = {
  version: 'nova.workspace.version',
  companies: 'nova.workspace.companies',
  customers: 'nova.workspace.customers',
  invoices: 'nova.workspace.invoices',
  quotes: 'nova.workspace.quotes',
  auditEvents: 'nova.workspace.auditEvents',
} as const

function readSessionFlag(key: string) {
  return typeof window !== 'undefined' && window.localStorage.getItem(key) === 'true'
}

function readWorkspaceRecords<T>(key: string, fallback: T[]) {
  if (typeof window === 'undefined') {
    return fallback
  }

  if (window.localStorage.getItem(workspaceKeys.version) !== workspaceVersion) {
    return fallback
  }

  const raw = window.localStorage.getItem(key)
  if (!raw) {
    return fallback
  }

  try {
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function writeWorkspaceRecords<T>(key: string, records: T[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(workspaceKeys.version, workspaceVersion)
  window.localStorage.setItem(key, JSON.stringify(records))
}

function resetWorkspaceStorage() {
  if (typeof window === 'undefined') {
    return
  }

  Object.values(workspaceKeys).forEach((key) => window.localStorage.removeItem(key))
}

function readActiveCompanyId() {
  if (typeof window === 'undefined') {
    return companyId
  }

  const storedCompanyId = window.localStorage.getItem(sessionKeys.activeCompanyId)
  const storedCompanies = readWorkspaceRecords(workspaceKeys.companies, companies)
  return storedCompanies.some((company) => company.id === storedCompanyId) ? storedCompanyId ?? companyId : companyId
}

function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    if (!readSessionFlag(sessionKeys.authenticated)) {
      return 'login'
    }

    return readSessionFlag(sessionKeys.onboarded) ? 'dashboard' : 'onboarding'
  })
  const [activeCompanyId, setActiveCompanyIdState] = useState(readActiveCompanyId)
  const [companyRecords, setCompanyRecords] = useState<Company[]>(() => readWorkspaceRecords(workspaceKeys.companies, companies))
  const [customerRecords, setCustomerRecords] = useState<Customer[]>(() => readWorkspaceRecords(workspaceKeys.customers, customers))
  const [invoiceRecords, setInvoiceRecords] = useState<Invoice[]>(() => readWorkspaceRecords(workspaceKeys.invoices, invoices))
  const [quoteRecords, setQuoteRecords] = useState<Quote[]>(() => readWorkspaceRecords(workspaceKeys.quotes, quotes))
  const [auditRecords, setAuditRecords] = useState<AuditEvent[]>(() => readWorkspaceRecords(workspaceKeys.auditEvents, auditEvents))
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0].id)
  const [selectedInvoice, setSelectedInvoice] = useState(invoices[0].id)
  const [selectedQuote, setSelectedQuote] = useState(quotes[0].id)
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const [invoiceRows, setInvoiceRows] = useState([
    { description: 'Adviespakket Groei', quantity: 1, price: 1250, vat: 21 },
    { description: 'Maandelijkse support', quantity: 1, price: 395, vat: 21 },
  ])

  const metrics = useMemo(() => {
    const companyInvoices = invoiceRecords.filter((invoice) => invoice.companyId === activeCompanyId)
    const open = companyInvoices.filter((invoice) => invoice.status !== 'Betaald').reduce((sum, invoice) => sum + invoice.amount, 0)
    const overdue = companyInvoices.filter((invoice) => invoice.status === 'Verlopen').reduce((sum, invoice) => sum + invoice.amount, 0)
    const revenue = monthlyData.at(-1)?.omzet ?? 0
    const costs = monthlyData.at(-1)?.kosten ?? 0
    return {
      open,
      overdue,
      revenue,
      costs,
      profit: revenue - costs,
      vatDue: 2786,
    }
  }, [activeCompanyId, invoiceRecords])

  const companyCustomers = customerRecords.filter((customer) => customer.companyId === activeCompanyId)
  const companyInvoices = invoiceRecords.filter((invoice) => invoice.companyId === activeCompanyId)
  const companyQuotes = quoteRecords.filter((quote) => quote.companyId === activeCompanyId)
  const companyAuditEvents = auditRecords.filter((event) => event.companyId === activeCompanyId)
  const filteredCustomers = companyCustomers.filter((customer) => customerMatches(customer, globalSearch))
  const filteredInvoices = companyInvoices.filter((invoice) => invoiceMatches(invoice, companyCustomers, globalSearch))
  const filteredQuotes = companyQuotes.filter((quote) => quoteMatches(quote, companyCustomers, globalSearch))
  const activeCompany = companyRecords.find((company) => company.id === activeCompanyId) ?? companyRecords[0] ?? companies[0]
  const currentCustomer = companyCustomers.find((customer) => customer.id === selectedCustomer) ?? companyCustomers[0] ?? customers[0]
  const currentInvoice = companyInvoices.find((invoice) => invoice.id === selectedInvoice) ?? companyInvoices[0]
  const currentQuote = companyQuotes.find((quote) => quote.id === selectedQuote) ?? companyQuotes[0]
  const invoiceTotal = invoiceRows.reduce((sum, row) => sum + row.quantity * row.price * (1 + row.vat / 100), 0)
  const nextInvoiceNumber = nextDocumentNumber(companyInvoices.map((invoice) => invoice.number), '2026')
  const nextQuoteNumber = nextDocumentNumber(companyQuotes.map((quote) => quote.number), 'OFF-2026', 3)

  useEffect(() => {
    writeWorkspaceRecords(workspaceKeys.companies, companyRecords)
  }, [companyRecords])

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
    writeWorkspaceRecords(workspaceKeys.auditEvents, auditRecords)
  }, [auditRecords])

  const setActiveCompanyId = (nextCompanyId: string) => {
    setActiveCompanyIdState(nextCompanyId)
    window.localStorage.setItem(sessionKeys.activeCompanyId, nextCompanyId)
  }

  const completeLogin = () => {
    window.localStorage.setItem(sessionKeys.authenticated, 'true')
    setScreen(readSessionFlag(sessionKeys.onboarded) ? 'dashboard' : 'onboarding')
  }

  const completeOnboarding = () => {
    window.localStorage.setItem(sessionKeys.onboarded, 'true')
    window.localStorage.setItem(sessionKeys.activeCompanyId, activeCompanyId)
    setScreen('dashboard')
  }

  const logout = () => {
    window.localStorage.removeItem(sessionKeys.authenticated)
    setScreen('login')
  }

  if (screen === 'login') {
    return <AuthScreen onLogin={completeLogin} />
  }

  if (screen === 'onboarding') {
    return <OnboardingScreen onComplete={completeOnboarding} />
  }

  const navigate = (next: Screen) => {
    setScreen(next)
    setMenuOpen(false)
  }

  const appendAudit = (companyId: string, action: string, entityType: AuditEvent['entityType'], entityId: string) => {
    setAuditRecords((records) => [
      {
        id: `evt_${Date.now()}`,
        companyId,
        action,
        entityType,
        entityId,
        createdAt: new Date().toISOString(),
      },
      ...records,
    ])
  }

  const saveCustomer = (customer: Customer) => {
    const exists = customerRecords.some((record) => record.id === customer.id)
    setCustomerRecords((records) => {
      return exists ? records.map((record) => (record.id === customer.id ? customer : record)) : [customer, ...records]
    })
    appendAudit(customer.companyId, `${exists ? 'Klant bijgewerkt' : 'Klant toegevoegd'}: ${customer.name}`, 'customer', customer.id)
    setSelectedCustomer(customer.id)
    setEditingCustomerId(null)
    navigate('customer-detail')
  }

  const saveCompany = (company: Company) => {
    const exists = companyRecords.some((record) => record.id === company.id)
    setCompanyRecords((records) => (exists ? records.map((record) => (record.id === company.id ? company : record)) : [company, ...records]))
    appendAudit(company.id, `${exists ? 'Bedrijf bijgewerkt' : 'Bedrijf toegevoegd'}: ${company.name}`, 'company', company.id)
    setEditingCompanyId(null)
    setActiveCompanyId(company.id)
    navigate('companies')
  }

  const saveInvoice = (invoice: Invoice) => {
    setInvoiceRecords((records) => [invoice, ...records])
    appendAudit(invoice.companyId, `Factuur ${invoice.number} aangemaakt voor ${nameFor(invoice.customerId, customerRecords)}`, 'invoice', invoice.id)
    setSelectedInvoice(invoice.id)
    navigate('invoice-detail')
  }

  const saveQuote = (quote: Quote) => {
    setQuoteRecords((records) => [quote, ...records])
    appendAudit(quote.companyId, `Offerte ${quote.number} aangemaakt voor ${nameFor(quote.customerId, customerRecords)}`, 'quote', quote.id)
    setSelectedQuote(quote.id)
    navigate('quote-detail')
  }

  const updateInvoiceStatus = (invoiceId: string, status: InvoiceStatus) => {
    const invoice = invoiceRecords.find((record) => record.id === invoiceId)
    setInvoiceRecords((records) => records.map((record) => (record.id === invoiceId ? { ...record, status } : record)))
    if (invoice) {
      appendAudit(invoice.companyId, `Factuur ${invoice.number} gemarkeerd als ${status.toLowerCase()}`, 'invoice', invoice.id)
    }
  }

  const updateQuoteStatus = (quoteId: string, status: QuoteStatus) => {
    const quote = quoteRecords.find((record) => record.id === quoteId)
    setQuoteRecords((records) => records.map((record) => (record.id === quoteId ? { ...record, status } : record)))
    if (quote) {
      appendAudit(quote.companyId, `Offerte ${quote.number} gemarkeerd als ${status.toLowerCase()}`, 'quote', quote.id)
    }
  }

  const convertQuoteToInvoice = (quote: Quote) => {
    const invoice: Invoice = {
      id: `inv_${Date.now()}`,
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
    setQuoteRecords((records) => records.map((record) => (record.id === quote.id ? { ...record, status: 'Geaccepteerd' } : record)))
    appendAudit(quote.companyId, `Offerte ${quote.number} omgezet naar factuur ${invoice.number}`, 'quote', quote.id)
    saveInvoice(invoice)
  }

  const resetWorkspace = () => {
    resetWorkspaceStorage()
    setCompanyRecords(companies)
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
      customers: customerRecords,
      invoices: invoiceRecords,
      quotes: quoteRecords,
      auditEvents: auditRecords,
    }

    window.localStorage.setItem('nova.workspace.lastExport', JSON.stringify(payload))
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `nova-office-export-${todayIso()}.json`
    link.click()
    window.URL.revokeObjectURL(url)
    appendAudit(activeCompanyId, 'Werkruimte-export voorbereid', 'settings', activeCompanyId)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <Brand />
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
          {navItems.map(([id, Icon, label]) => (
            <button key={id} className={screen === id ? 'active' : ''} onClick={() => navigate(id as Screen)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="plan-card">
          <Sparkles size={18} />
          <strong>MVP-fundering actief</strong>
          <span>Authenticatie, tenants, rollen, klanten, facturen en offertes.</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setMenuOpen((value) => !value)} aria-label="Menu openen">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <p className="eyebrow">Slim ondernemen vanuit een centrale omgeving</p>
            <h1>{titleFor(screen)}</h1>
          </div>
          <div className="topbar-actions">
            <div className="search">
              <Search size={17} />
              <input value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Zoek klanten, facturen of offertes" />
            </div>
            <button className="icon-button" aria-label="Meldingen">
              <Bell size={19} />
            </button>
            <button className="ghost" onClick={logout}>Uitloggen</button>
          </div>
        </header>

        <div className="module-tabs" aria-label="MVP modules">
          {(['dashboard', 'customers', 'invoices', 'quotes', 'companies', 'settings'] as Screen[]).map((module) => (
            <button key={module} className={screen === module ? 'active' : ''} onClick={() => navigate(module)}>
              {titleFor(module)}
            </button>
          ))}
        </div>

        {screen === 'dashboard' && (
          <Dashboard
            metrics={metrics}
            dashboardCustomers={filteredCustomers}
            dashboardInvoices={filteredInvoices}
            dashboardQuotes={filteredQuotes}
            auditEvents={companyAuditEvents}
            onNavigate={navigate}
          />
        )}
        {screen === 'customers' && (
          <Customers
            customers={filteredCustomers}
            onAdd={() => {
              setEditingCustomerId(null)
              navigate('customer-form')
            }}
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
        {screen === 'customer-detail' && (
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
        {screen === 'invoices' && (
          <Invoices
            invoices={companyInvoices}
            visibleInvoices={filteredInvoices}
            customers={companyCustomers}
            onCreate={() => navigate('invoice-create')}
            onMarkPaid={(id) => updateInvoiceStatus(id, 'Betaald')}
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
            rows={invoiceRows}
            total={invoiceTotal}
            onRowsChange={setInvoiceRows}
            onBack={() => navigate('invoices')}
            onSave={saveInvoice}
          />
        )}
        {screen === 'invoice-detail' && currentInvoice && (
          <InvoiceDetail invoice={currentInvoice} customers={companyCustomers} company={activeCompany} onBack={() => navigate('invoices')} onStatusChange={updateInvoiceStatus} />
        )}
        {screen === 'quotes' && (
          <Quotes
            quotes={companyQuotes}
            visibleQuotes={filteredQuotes}
            customers={companyCustomers}
            onCreate={() => navigate('quote-create')}
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
            onBack={() => navigate('quotes')}
            onSave={saveQuote}
          />
        )}
        {screen === 'quote-detail' && currentQuote && (
          <QuoteDetail quote={currentQuote} customers={companyCustomers} company={activeCompany} onBack={() => navigate('quotes')} onConvert={convertQuoteToInvoice} onStatusChange={updateQuoteStatus} />
        )}
        {screen === 'companies' && (
          <Companies
            companies={companyRecords}
            activeCompanyId={activeCompanyId}
            onSelect={setActiveCompanyId}
            onAdd={() => {
              setEditingCompanyId(null)
              navigate('company-form')
            }}
            onEdit={(id) => {
              setEditingCompanyId(id)
              navigate('company-form')
            }}
          />
        )}
        {screen === 'company-form' && (
          <CompanyForm
            company={editingCompanyId ? companyRecords.find((company) => company.id === editingCompanyId) : undefined}
            onCancel={() => navigate('companies')}
            onSave={saveCompany}
          />
        )}
        {screen === 'roles' && <Roles />}
        {screen === 'database' && <DatabaseFoundation />}
        {screen === 'design-system' && <DesignSystem />}
        {screen === 'settings' && (
          <SettingsPage
            activeCompany={activeCompany}
            auditEvents={companyAuditEvents}
            onExport={exportWorkspace}
            onReset={resetWorkspace}
          />
        )}
      </main>
    </div>
  )
}

function AuthScreen({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const titles = {
    login: 'Inloggen bij NOVA Office',
    register: 'Nieuw account aanmaken',
    forgot: 'Wachtwoord herstellen',
  }

  return (
    <div className="auth-page">
      <section className="auth-visual">
        <Brand />
        <h1>Welkom bij NOVA Office</h1>
        <p>Een schaalbare bedrijfsomgeving voor dashboard, klanten, facturen, offertes, rollen en meerdere bedrijven.</p>
        <div className="auth-stats">
          <Metric label="Bedrijven" value="2" />
          <Metric label="Rollen" value="4" />
          <Metric label="MVP-modules" value="8" />
        </div>
      </section>
      <section className="auth-panel">
        <p className="eyebrow">Authenticatie</p>
        <h2>{titles[mode]}</h2>
        {mode === 'register' && <label>Naam<input defaultValue="Glen Mulder" /></label>}
        <label>E-mailadres<input defaultValue="ondernemer@novaoffice.nl" /></label>
        {mode !== 'forgot' && <label>Wachtwoord<input defaultValue="novademo2026" type="password" /></label>}
        {mode === 'register' && <label>Bedrijfsnaam<input defaultValue="NOVA Demo BV" /></label>}
        <button className="primary full" onClick={onLogin}>
          <LogIn size={18} />
          {mode === 'forgot' ? 'Herstellink simuleren' : 'Doorgaan'}
        </button>
        <div className="auth-links">
          <button onClick={() => setMode('login')}>Inloggen</button>
          <button onClick={() => setMode('register')}>Registreren</button>
          <button onClick={() => setMode('forgot')}>Wachtwoord vergeten</button>
        </div>
      </section>
    </div>
  )
}

function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const resetDemo = () => {
    window.localStorage.removeItem(sessionKeys.onboarded)
    window.localStorage.removeItem(sessionKeys.activeCompanyId)
    window.location.reload()
  }

  return (
    <div className="onboarding-page">
      <Brand />
      <section className="onboarding-grid">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h1>Richt je bedrijfsomgeving in</h1>
          <p>NOVA Office koppelt alle administratie aan een bedrijf, zodat het platform geschikt blijft voor meerdere gebruikers en administraties.</p>
          <div className="data-model">
            {['Users', 'Companies', 'Memberships', 'Roles', 'Customers', 'Invoices', 'InvoiceItems', 'Quotes', 'QuoteItems'].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <form className="setup-form">
          <label>Bedrijfsnaam<input defaultValue="NOVA Demo BV" /></label>
          <label>KvK-nummer<input defaultValue="87124490" /></label>
          <label>BTW-nummer<input defaultValue="NL862145901B01" /></label>
          <label>Startpakket<select defaultValue="NOVA Start"><option>NOVA Start</option><option>NOVA ZZP</option><option>NOVA MKB</option><option>NOVA Enterprise</option></select></label>
          <button type="button" className="primary" onClick={onComplete}>Dashboard openen <ArrowRight size={18} /></button>
          <button type="button" className="ghost full" onClick={resetDemo}>Demo opnieuw starten</button>
        </form>
      </section>
    </div>
  )
}

function Dashboard({
  metrics,
  dashboardCustomers,
  dashboardInvoices,
  dashboardQuotes,
  auditEvents,
  onNavigate,
}: {
  metrics: Record<string, number>
  dashboardCustomers: Customer[]
  dashboardInvoices: Invoice[]
  dashboardQuotes: Quote[]
  auditEvents: AuditEvent[]
  onNavigate: (screen: Screen) => void
}) {
  return (
    <div className="content-grid">
      <section className="kpi-grid">
        <Metric label="Omzet deze maand" value={eur.format(metrics.revenue)} trend="juli" />
        <Metric label="Openstaande facturen" value={eur.format(metrics.open)} trend="+12%" />
        <Metric label="Verlopen facturen" value={eur.format(metrics.overdue)} trend="actie nodig" />
        <Metric label="Aantal klanten" value={String(dashboardCustomers.length)} trend="tenant-safe" />
        <Metric label="Concept offertes" value={String(dashboardQuotes.filter((quote) => quote.status === 'Concept').length)} trend="workflow" />
      </section>

      <section className="panel wide">
        <PanelHeader title="MVP-activiteit" action="Bekijk facturen" onAction={() => onNavigate('invoices')} />
        <div className="chart">
          <ResponsiveContainer>
            <AreaChart data={monthlyData}>
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
        <PanelHeader title="Snelle acties" />
        <div className="quick-actions">
          <button onClick={() => onNavigate('invoice-create')}><FilePlus2 size={18} /> Factuur maken</button>
          <button onClick={() => onNavigate('quotes')}><FileCheck2 size={18} /> Offerte maken</button>
          <button onClick={() => onNavigate('companies')}><Building2 size={18} /> Bedrijf wisselen</button>
          <button onClick={() => onNavigate('customers')}><Users size={18} /> Klanten beheren</button>
        </div>
      </section>

      <section className="panel">
        <PanelHeader title="Recente activiteit" />
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
    id: `cus_${Date.now()}`,
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
    </section>
  )
}

function InvoiceCreate({
  activeCompanyId,
  customers,
  number,
  rows,
  total,
  onRowsChange,
  onBack,
  onSave,
}: {
  activeCompanyId: string
  customers: Customer[]
  number: string
  rows: InvoiceRow[]
  total: number
  onRowsChange: (rows: InvoiceRow[]) => void
  onBack: () => void
  onSave: (invoice: Invoice) => void
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [invoiceDate, setInvoiceDate] = useState(todayIso())
  const [dueDate, setDueDate] = useState(addDaysIso(14))
  const [status, setStatus] = useState<InvoiceStatus>('Concept')
  const [error, setError] = useState('')
  const addRow = () => onRowsChange([...rows, { description: 'Nieuwe regel', quantity: 1, price: 0, vat: 21 }])
  const subtotal = rows.reduce((sum, row) => sum + row.quantity * row.price, 0)
  const vatTotal = total - subtotal
  const removeRow = (index: number) => onRowsChange(rows.filter((_, rowIndex) => rowIndex !== index))
  const save = () => {
    if (!customerId || rows.some((row) => !row.description.trim() || row.quantity <= 0 || row.price < 0)) {
      setError('Kies een klant en vul alle factuurregels correct in.')
      return
    }

    onSave({
      id: `inv_${Date.now()}`,
      companyId: activeCompanyId,
      customerId,
      number,
      date: invoiceDate,
      due: dueDate,
      amount: total,
      vat: vatTotal,
      status,
      items: rows,
    })
  }

  return (
    <div className="invoice-builder">
      <section className="panel">
        <button className="table-link" onClick={onBack}>Terug naar facturen</button>
        <PanelHeader title="Nieuwe factuur" />
        {error && <p className="form-error">{error}</p>}
        <div className="form-grid">
          <label>Klant<select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
          <label>Factuurnummer<input value={number} readOnly /></label>
          <label>Factuurdatum<input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} /></label>
          <label>Vervaldatum<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          <label>Betalingstermijn<select value={dueDate} onChange={(event) => setDueDate(addDaysIso(Number(event.target.value)))}><option value={addDaysIso(7)}>7 dagen</option><option value={addDaysIso(14)}>14 dagen</option><option value={addDaysIso(30)}>30 dagen</option></select></label>
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
          {rows.map((row, index) => (
            <div className="line-row" key={`${row.description}-${index}`}>
              <input value={row.description} onChange={(event) => updateRow(rows, onRowsChange, index, 'description', event.target.value)} />
              <input type="number" value={row.quantity} onChange={(event) => updateRow(rows, onRowsChange, index, 'quantity', Number(event.target.value))} />
              <input type="number" value={row.price} onChange={(event) => updateRow(rows, onRowsChange, index, 'price', Number(event.target.value))} />
              <select value={row.vat} onChange={(event) => updateRow(rows, onRowsChange, index, 'vat', Number(event.target.value))}><option value={21}>21%</option><option value={9}>9%</option><option value={0}>0%</option></select>
              <strong>{eur.format(row.quantity * row.price * (1 + row.vat / 100))}</strong>
              <button className="icon-button compact" onClick={() => removeRow(index)} aria-label="Regel verwijderen"><X size={16} /></button>
            </div>
          ))}
        </div>
        <div className="invoice-actions">
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
          {rows.map((row, index) => (
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
  onBack,
  onStatusChange,
}: {
  invoice: Invoice
  customers: Customer[]
  company: Company
  onBack: () => void
  onStatusChange: (invoiceId: string, status: InvoiceStatus) => void
}) {
  const totals = calculateTotals(invoice.items)
  const customer = customers.find((record) => record.id === invoice.customerId)
  const download = () => downloadHtml(
    `factuur-${invoice.number}.html`,
    createPrintableDocumentHtml({
      type: 'invoice',
      number: invoice.number,
      status: invoice.status,
      companyName: company.name,
      companyVat: company.vat,
      companyChamber: company.chamber,
      customerName: customer?.name ?? 'Onbekende klant',
      customerAddress: customer ? `${customer.address}, ${customer.postalCode} ${customer.city}` : '',
      date: invoice.date,
      dueDate: invoice.due,
      lines: invoice.items,
    }),
  )

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
          {(['Concept', 'Verzonden', 'Betaald', 'Verlopen'] as InvoiceStatus[]).map((status) => (
            <button key={status} className={invoice.status === status ? 'primary' : 'ghost'} onClick={() => onStatusChange(invoice.id, status)}>
              {status}
            </button>
          ))}
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
        <button className="primary full" onClick={() => window.print()}>Printen</button>
        <button className="ghost full" onClick={download}><Download size={17} /> Download HTML</button>
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
    </section>
  )
}

function QuoteCreate({
  activeCompanyId,
  customers,
  number,
  onBack,
  onSave,
}: {
  activeCompanyId: string
  customers: Customer[]
  number: string
  onBack: () => void
  onSave: (quote: Quote) => void
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [validUntil, setValidUntil] = useState(addDaysIso(21))
  const [status, setStatus] = useState<QuoteStatus>('Concept')
  const [rows, setRows] = useState<InvoiceRow[]>([{ description: 'Nieuw voorstel', quantity: 1, price: 1500, vat: 21 }])
  const [error, setError] = useState('')
  const totals = calculateTotals(rows)
  const addRow = () => setRows([...rows, { description: 'Nieuwe regel', quantity: 1, price: 0, vat: 21 }])
  const save = () => {
    if (!customerId || rows.some((row) => !row.description.trim() || row.quantity <= 0 || row.price < 0)) {
      setError('Kies een klant en vul alle offerteregels correct in.')
      return
    }

    onSave({
      id: `quo_${Date.now()}`,
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

  return (
    <div className="invoice-builder">
      <section className="panel">
        <button className="table-link" onClick={onBack}>Terug naar offertes</button>
        <PanelHeader title="Nieuwe offerte" />
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
  onBack,
  onConvert,
  onStatusChange,
}: {
  quote: Quote
  customers: Customer[]
  company: Company
  onBack: () => void
  onConvert: (quote: Quote) => void
  onStatusChange: (quoteId: string, status: QuoteStatus) => void
}) {
  const totals = calculateTotals(quote.items)
  const customer = customers.find((record) => record.id === quote.customerId)
  const download = () => downloadHtml(
    `offerte-${quote.number}.html`,
    createPrintableDocumentHtml({
      type: 'quote',
      number: quote.number,
      status: quote.status,
      companyName: company.name,
      companyVat: company.vat,
      companyChamber: company.chamber,
      customerName: customer?.name ?? 'Onbekende klant',
      customerAddress: customer ? `${customer.address}, ${customer.postalCode} ${customer.city}` : '',
      date: todayIso(),
      validUntil: quote.validUntil,
      lines: quote.items,
    }),
  )

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
          {(['Concept', 'Verzonden', 'Geaccepteerd', 'Afgewezen'] as QuoteStatus[]).map((status) => (
            <button key={status} className={quote.status === status ? 'primary' : 'ghost'} onClick={() => onStatusChange(quote.id, status)}>
              {status}
            </button>
          ))}
          <button className="primary" onClick={() => onConvert(quote)}>Omzetten naar factuur</button>
          <button className="ghost" onClick={() => window.print()}>Printen</button>
          <button className="ghost" onClick={download}><Download size={17} /> Download HTML</button>
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
      <PanelHeader title="Bedrijven en administraties" action="Bedrijf toevoegen" onAction={onAdd} />
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
  const [city, setCity] = useState(company?.city ?? '')
  const [chamber, setChamber] = useState(company?.chamber ?? '')
  const [vat, setVat] = useState(company?.vat ?? '')
  const [role, setRole] = useState<CompanyRole>(company?.role ?? 'Eigenaar')
  const [plan, setPlan] = useState<CompanyPlan>(company?.plan ?? 'NOVA Start')
  const [error, setError] = useState('')

  const save = () => {
    if (!name.trim() || !city.trim() || !chamber.trim() || !vat.trim()) {
      setError('Vul bedrijfsnaam, plaats, KvK en BTW-nummer in.')
      return
    }

    onSave({
      id: company?.id ?? `comp_${Date.now()}`,
      name,
      city,
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
        <label>Plaats<input value={city} onChange={(event) => setCity(event.target.value)} /></label>
        <label>KvK-nummer<input value={chamber} onChange={(event) => setChamber(event.target.value)} /></label>
        <label>BTW-nummer<input value={vat} onChange={(event) => setVat(event.target.value)} /></label>
        <label>Rol<select value={role} onChange={(event) => setRole(event.target.value as CompanyRole)}><option>Eigenaar</option><option>Beheerder</option><option>Financieel medewerker</option><option>Lezer</option></select></label>
        <label>Pakket<select value={plan} onChange={(event) => setPlan(event.target.value as CompanyPlan)}><option>NOVA Start</option><option>NOVA ZZP</option><option>NOVA MKB</option><option>NOVA Enterprise</option></select></label>
      </div>
      <div className="invoice-actions">
        <button className="ghost" onClick={onCancel}>Annuleren</button>
        <button className="primary" onClick={save}>Bedrijf opslaan</button>
      </div>
    </section>
  )
}

function Roles() {
  return (
    <div className="content-grid">
      <section className="panel wide">
        <PanelHeader title="Rollen en rechten" />
        <DataTable columns={['Rol', 'Toegang']} rows={roles.map((role) => [role.name, role.access])} />
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
  auditEvents,
  onExport,
  onReset,
}: {
  activeCompany: { id: string; name: string; role: string; plan: string }
  auditEvents: AuditEvent[]
  onExport: () => void
  onReset: () => void
}) {
  return (
    <div className="content-grid">
      <SettingsBlock icon={<Building2 />} title="Bedrijfsgegevens" text={`${activeCompany.name}, pakket ${activeCompany.plan}, tenant ${activeCompany.id}`} />
      <SettingsBlock icon={<ShieldCheck />} title="Gebruikers en rechten" text="Voorbereid op meerdere gebruikers, rollen en audit logs." />
      <SettingsBlock icon={<WalletCards />} title="Factuurinstellingen" text="Automatische nummers, betalingstermijnen en BTW-standaarden." />
      <SettingsBlock icon={<BriefcaseBusiness />} title="Administraties" text="Data blijft gekoppeld aan company_id en wordt lokaal persistent opgeslagen." />
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

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">N</div>
      <div><strong>NOVA Office</strong><span>Business platform</span></div>
    </div>
  )
}

function Metric({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong>{trend && <em>{trend}</em>}</article>
}

function PanelHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="panel-header"><h2>{title}</h2>{action && <button className="primary" onClick={onAction}>{action}</button>}</div>
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
          {rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}
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

function addDaysIso(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
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

function titleFor(screen: Screen) {
  const titles: Record<Screen, string> = {
    login: 'Inloggen',
    onboarding: 'Onboarding',
    dashboard: 'Dashboard',
    customers: 'Klanten',
    'customer-form': 'Klant toevoegen',
    'customer-detail': 'Klant detail',
    invoices: 'Facturen',
    'invoice-create': 'Factuur aanmaken',
    'invoice-detail': 'Factuur detail',
    quotes: 'Offertes',
    'quote-create': 'Offerte aanmaken',
    'quote-detail': 'Offerte detail',
    companies: 'Bedrijven',
    'company-form': 'Bedrijf beheren',
    roles: 'Rollen en rechten',
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
    settings: 'Instellingen',
    subscription: 'Abonnement',
  }
  return titles[screen]
}

export default App
