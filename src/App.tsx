import { type ReactNode, useMemo, useState } from 'react'
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
import { foundationRules, foundationSchema, tenantScopedTables } from './foundation/database'
import './App.css'

type Screen =
  | 'login'
  | 'onboarding'
  | 'dashboard'
  | 'customers'
  | 'customer-detail'
  | 'invoices'
  | 'invoice-create'
  | 'quotes'
  | 'companies'
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

type Customer = {
  id: string
  companyId: string
  name: string
  contact: string
  email: string
  phone: string
  address: string
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
}

type Quote = {
  id: string
  companyId: string
  customerId: string
  number: string
  amount: number
  status: QuoteStatus
  validUntil: string
}

type InvoiceRow = {
  description: string
  quantity: number
  price: number
  vat: number
}

const companyId = 'comp_nova_demo'

const companies = [
  { id: 'comp_nova_demo', name: 'NOVA Demo BV', role: 'Eigenaar', plan: 'NOVA Start' },
  { id: 'comp_orbit_studio', name: 'Orbit Studio VOF', role: 'Beheerder', plan: 'NOVA Start' },
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
    address: 'Keizersgracht 214, Amsterdam',
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
    address: 'Rijnhaven 32, Rotterdam',
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
    address: 'Biltstraat 112, Utrecht',
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
    address: 'Noordeinde 88, Den Haag',
    vat: 'NL809912344B01',
    chamber: '63091244',
    revenue: 8420,
  },
]

const invoices: Invoice[] = [
  { id: 'inv_01', companyId, customerId: 'cus_01', number: '2026-0142', date: '2026-07-01', due: '2026-07-15', amount: 3920, vat: 680, status: 'Verzonden' },
  { id: 'inv_02', companyId, customerId: 'cus_02', number: '2026-0141', date: '2026-06-26', due: '2026-07-10', amount: 8470, vat: 1470, status: 'Betaald' },
  { id: 'inv_03', companyId, customerId: 'cus_03', number: '2026-0140', date: '2026-06-18', due: '2026-07-02', amount: 2118, vat: 368, status: 'Verlopen' },
  { id: 'inv_04', companyId, customerId: 'cus_01', number: '2026-0139', date: '2026-06-15', due: '2026-06-29', amount: 1452, vat: 252, status: 'Concept' },
  { id: 'inv_05', companyId: 'comp_orbit_studio', customerId: 'cus_04', number: '2026-0031', date: '2026-07-01', due: '2026-07-15', amount: 1815, vat: 315, status: 'Verzonden' },
]

const quotes: Quote[] = [
  { id: 'quo_01', companyId, customerId: 'cus_03', number: 'OFF-2026-055', amount: 6400, status: 'Verzonden', validUntil: '2026-07-18' },
  { id: 'quo_02', companyId, customerId: 'cus_01', number: 'OFF-2026-054', amount: 2800, status: 'Geaccepteerd', validUntil: '2026-07-08' },
  { id: 'quo_03', companyId, customerId: 'cus_02', number: 'OFF-2026-053', amount: 11900, status: 'Concept', validUntil: '2026-07-26' },
  { id: 'quo_04', companyId: 'comp_orbit_studio', customerId: 'cus_04', number: 'OFF-2026-012', amount: 3200, status: 'Concept', validUntil: '2026-07-28' },
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

function readSessionFlag(key: string) {
  return typeof window !== 'undefined' && window.localStorage.getItem(key) === 'true'
}

function readActiveCompanyId() {
  if (typeof window === 'undefined') {
    return companyId
  }

  const storedCompanyId = window.localStorage.getItem(sessionKeys.activeCompanyId)
  return companies.some((company) => company.id === storedCompanyId) ? storedCompanyId ?? companyId : companyId
}

function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    if (!readSessionFlag(sessionKeys.authenticated)) {
      return 'login'
    }

    return readSessionFlag(sessionKeys.onboarded) ? 'dashboard' : 'onboarding'
  })
  const [activeCompanyId, setActiveCompanyIdState] = useState(readActiveCompanyId)
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0].id)
  const [menuOpen, setMenuOpen] = useState(false)
  const [invoiceRows, setInvoiceRows] = useState([
    { description: 'Adviespakket Groei', quantity: 1, price: 1250, vat: 21 },
    { description: 'Maandelijkse support', quantity: 1, price: 395, vat: 21 },
  ])

  const metrics = useMemo(() => {
    const companyInvoices = invoices.filter((invoice) => invoice.companyId === activeCompanyId)
    const open = companyInvoices.filter((invoice) => invoice.status !== 'Betaald').reduce((sum, invoice) => sum + invoice.amount, 0)
    const revenue = monthlyData.at(-1)?.omzet ?? 0
    const costs = monthlyData.at(-1)?.kosten ?? 0
    return {
      open,
      revenue,
      costs,
      profit: revenue - costs,
      vatDue: 2786,
    }
  }, [activeCompanyId])

  const companyCustomers = customers.filter((customer) => customer.companyId === activeCompanyId)
  const companyInvoices = invoices.filter((invoice) => invoice.companyId === activeCompanyId)
  const companyQuotes = quotes.filter((quote) => quote.companyId === activeCompanyId)
  const activeCompany = companies.find((company) => company.id === activeCompanyId) ?? companies[0]
  const currentCustomer = companyCustomers.find((customer) => customer.id === selectedCustomer) ?? companyCustomers[0] ?? customers[0]
  const invoiceTotal = invoiceRows.reduce((sum, row) => sum + row.quantity * row.price * (1 + row.vat / 100), 0)

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
            {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
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
              <input placeholder="Zoek klanten, facturen of offertes" />
            </div>
            <button className="icon-button" aria-label="Meldingen">
              <Bell size={19} />
            </button>
            <button className="ghost" onClick={logout}>Uitloggen</button>
          </div>
        </header>

        {screen === 'dashboard' && <Dashboard metrics={metrics} dashboardCustomers={companyCustomers} dashboardInvoices={companyInvoices} dashboardQuotes={companyQuotes} onNavigate={navigate} />}
        {screen === 'customers' && <Customers customers={companyCustomers} onSelect={(id) => { setSelectedCustomer(id); navigate('customer-detail') }} />}
        {screen === 'customer-detail' && <CustomerDetail customer={currentCustomer} onBack={() => navigate('customers')} />}
        {screen === 'invoices' && <Invoices invoices={companyInvoices} onCreate={() => navigate('invoice-create')} />}
        {screen === 'invoice-create' && (
          <InvoiceCreate
            rows={invoiceRows}
            total={invoiceTotal}
            onRowsChange={setInvoiceRows}
            onBack={() => navigate('invoices')}
          />
        )}
        {screen === 'quotes' && <Quotes quotes={companyQuotes} />}
        {screen === 'companies' && <Companies activeCompanyId={activeCompanyId} onSelect={setActiveCompanyId} />}
        {screen === 'roles' && <Roles />}
        {screen === 'database' && <DatabaseFoundation />}
        {screen === 'design-system' && <DesignSystem />}
        {screen === 'settings' && <SettingsPage />}
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
  onNavigate,
}: {
  metrics: Record<string, number>
  dashboardCustomers: Customer[]
  dashboardInvoices: Invoice[]
  dashboardQuotes: Quote[]
  onNavigate: (screen: Screen) => void
}) {
  return (
    <div className="content-grid">
      <section className="kpi-grid">
        <Metric label="Openstaande facturen" value={eur.format(metrics.open)} trend="+12%" />
        <Metric label="Actieve klanten" value={String(dashboardCustomers.length)} trend="tenant-safe" />
        <Metric label="Offertes open" value={String(dashboardQuotes.filter((quote) => quote.status !== 'Geaccepteerd').length)} trend="workflow" />
        <Metric label="Rollen ingericht" value={String(roles.length)} trend="RBAC" />
        <Metric label="Bedrijven" value={String(companies.length)} trend="multi-tenant" />
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
          <button onClick={() => onNavigate('customers')}><Users size={18} /> Klant toevoegen</button>
        </div>
      </section>

      <section className="panel">
        <PanelHeader title="Fundering status" />
        <div className="suggestions">
          <span><Check size={16} /> Authenticatieflows aanwezig</span>
          <span><Check size={16} /> Data gefilterd per company_id</span>
          <span><Check size={16} /> Rollenmodel voorbereid</span>
        </div>
      </section>

      <section className="panel wide">
        <PanelHeader title="Recente facturen" action="Nieuwe factuur" onAction={() => onNavigate('invoice-create')} />
        <DataTable
          columns={['Factuur', 'Klant', 'Vervaldatum', 'Bedrag', 'Status']}
          rows={dashboardInvoices.slice(0, 4).map((invoice) => [invoice.number, nameFor(invoice.customerId), invoice.due, eur.format(invoice.amount), <Status key={invoice.id} label={invoice.status} />])}
        />
      </section>
    </div>
  )
}

function Customers({ customers, onSelect }: { customers: Customer[]; onSelect: (id: string) => void }) {
  return (
    <section className="panel">
      <PanelHeader title="Klantenoverzicht" action="Klant toevoegen" />
      <DataTable
        columns={['Bedrijf', 'Contactpersoon', 'E-mail', 'Telefoon', 'Omzet', '']}
        rows={customers.map((customer) => [
          customer.name,
          customer.contact,
          customer.email,
          customer.phone,
          eur.format(customer.revenue),
          <button key={customer.id} className="table-link" onClick={() => onSelect(customer.id)}>Openen</button>,
        ])}
      />
    </section>
  )
}

function CustomerDetail({ customer, onBack }: { customer: Customer; onBack: () => void }) {
  const customerInvoices = invoices.filter((invoice) => invoice.customerId === customer.id)
  const customerQuotes = quotes.filter((quote) => quote.customerId === customer.id)
  return (
    <div className="content-grid">
      <section className="panel">
        <button className="table-link" onClick={onBack}>Terug naar klanten</button>
        <h2>{customer.name}</h2>
        <div className="detail-list">
          <span>Contactpersoon<strong>{customer.contact}</strong></span>
          <span>E-mail<strong>{customer.email}</strong></span>
          <span>Telefoon<strong>{customer.phone}</strong></span>
          <span>Adres<strong>{customer.address}</strong></span>
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

function Invoices({ invoices, onCreate }: { invoices: Invoice[]; onCreate: () => void }) {
  return (
    <section className="panel">
      <PanelHeader title="Factuuroverzicht" action="Nieuwe factuur" onAction={onCreate} />
      <div className="filters">
        <span>Alle statussen</span><span>Deze maand</span><span>Zoeken op klant of nummer</span>
      </div>
      <DataTable
        columns={['Factuur', 'Klant', 'Datum', 'Vervaldatum', 'Bedrag', 'BTW', 'Status', 'Actie']}
        rows={invoices.map((invoice) => [
          invoice.number,
          nameFor(invoice.customerId),
          invoice.date,
          invoice.due,
          eur.format(invoice.amount),
          eur.format(invoice.vat),
          <Status key={invoice.id} label={invoice.status} />,
          invoice.status === 'Betaald' ? 'PDF-preview' : 'Betaling registreren',
        ])}
      />
    </section>
  )
}

function InvoiceCreate({ rows, total, onRowsChange, onBack }: { rows: InvoiceRow[]; total: number; onRowsChange: (rows: InvoiceRow[]) => void; onBack: () => void }) {
  const addRow = () => onRowsChange([...rows, { description: 'Nieuwe regel', quantity: 1, price: 0, vat: 21 }])
  const subtotal = rows.reduce((sum, row) => sum + row.quantity * row.price, 0)
  const vatTotal = total - subtotal
  const removeRow = (index: number) => onRowsChange(rows.filter((_, rowIndex) => rowIndex !== index))

  return (
    <div className="invoice-builder">
      <section className="panel">
        <button className="table-link" onClick={onBack}>Terug naar facturen</button>
        <PanelHeader title="Nieuwe factuur" action="Concept opslaan" />
        <div className="form-grid">
          <label>Klant<select><option>Studio Veldkamp</option><option>Rijnhaven Logistics</option><option>Nordbyte Systems</option></select></label>
          <label>Factuurnummer<input defaultValue="2026-0143" /></label>
          <label>Factuurdatum<input type="date" defaultValue="2026-07-02" /></label>
          <label>Vervaldatum<input type="date" defaultValue="2026-07-16" /></label>
          <label>Betalingstermijn<select defaultValue="14 dagen"><option>7 dagen</option><option>14 dagen</option><option>30 dagen</option></select></label>
          <label>Status<select defaultValue="Concept"><option>Concept</option><option>Verzonden</option><option>Betaald</option></select></label>
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
        </div>
      </section>
      <aside className="panel preview">
        <p className="eyebrow">PDF-preview</p>
        <h2>Factuur 2026-0143</h2>
        <div className="preview-meta">
          <span>Studio Veldkamp</span>
          <span>Vervalt op 16 juli 2026</span>
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
        <Status label="Concept" />
        <button className="primary full">Factuur verzenden</button>
      </aside>
    </div>
  )
}

function Quotes({ quotes }: { quotes: Quote[] }) {
  return (
    <section className="panel">
      <PanelHeader title="Offerte overzicht" action="Nieuwe offerte" />
      <DataTable
        columns={['Offerte', 'Klant', 'Geldig tot', 'Bedrag', 'Status', 'Actie']}
        rows={quotes.map((quote) => [quote.number, nameFor(quote.customerId), quote.validUntil, eur.format(quote.amount), <Status key={quote.id} label={quote.status} />, quote.status === 'Geaccepteerd' ? 'Omzetten naar factuur' : 'PDF-preview'])}
      />
    </section>
  )
}

function Companies({ activeCompanyId, onSelect }: { activeCompanyId: string; onSelect: (companyId: string) => void }) {
  return (
    <section className="panel">
      <PanelHeader title="Bedrijven en administraties" action="Bedrijf toevoegen" />
      <DataTable
        columns={['Bedrijf', 'Rol', 'Pakket', 'Tenant key', 'Status']}
        rows={companies.map((company) => [
          company.name,
          company.role,
          company.plan,
          company.id,
          <button key={company.id} className="table-link" onClick={() => onSelect(company.id)}>
            {company.id === activeCompanyId ? 'Actief' : 'Activeren'}
          </button>,
        ])}
      />
    </section>
  )
}

function Roles() {
  return (
    <div className="content-grid">
      <section className="panel wide">
        <PanelHeader title="Rollen en rechten" action="Rol toevoegen" />
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
        <PanelHeader title="Design-system basis" action="Component toevoegen" />
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

function SettingsPage() {
  return (
    <div className="content-grid">
      <SettingsBlock icon={<Building2 />} title="Bedrijfsgegevens" text="NOVA Demo BV, BTW NL862145901B01, KvK 87124490" />
      <SettingsBlock icon={<ShieldCheck />} title="Gebruikers en rechten" text="Voorbereid op meerdere gebruikers, rollen en audit logs." />
      <SettingsBlock icon={<WalletCards />} title="Factuurinstellingen" text="Automatische nummers, betalingstermijnen en BTW-standaarden." />
      <SettingsBlock icon={<BriefcaseBusiness />} title="Administraties" text="Data blijft gekoppeld aan company_id voor multi-tenant SaaS." />
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
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
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

function nameFor(customerId: string) {
  return customers.find((customer) => customer.id === customerId)?.name ?? 'Onbekende klant'
}

function titleFor(screen: Screen) {
  const titles: Record<Screen, string> = {
    login: 'Inloggen',
    onboarding: 'Onboarding',
    dashboard: 'Dashboard',
    customers: 'Klanten',
    'customer-detail': 'Klant detail',
    invoices: 'Facturen',
    'invoice-create': 'Factuur aanmaken',
    quotes: 'Offertes',
    companies: 'Bedrijven',
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
