import { type ReactNode, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowRight,
  BadgeEuro,
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  FilePlus2,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogIn,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
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
  | 'products'
  | 'accounting'
  | 'bank'
  | 'documents'
  | 'vat'
  | 'reports'
  | 'tasks'
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

type Transaction = {
  id: string
  companyId: string
  date: string
  description: string
  amount: number
  status: 'Gematcht' | 'Niet gematcht'
  category: string
}

type Task = {
  id: string
  companyId: string
  title: string
  due: string
  type: string
  done: boolean
}

type InvoiceRow = {
  description: string
  quantity: number
  price: number
  vat: number
}

const companyId = 'comp_nova_demo'

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
]

const invoices: Invoice[] = [
  { id: 'inv_01', companyId, customerId: 'cus_01', number: '2026-0142', date: '2026-07-01', due: '2026-07-15', amount: 3920, vat: 680, status: 'Verzonden' },
  { id: 'inv_02', companyId, customerId: 'cus_02', number: '2026-0141', date: '2026-06-26', due: '2026-07-10', amount: 8470, vat: 1470, status: 'Betaald' },
  { id: 'inv_03', companyId, customerId: 'cus_03', number: '2026-0140', date: '2026-06-18', due: '2026-07-02', amount: 2118, vat: 368, status: 'Verlopen' },
  { id: 'inv_04', companyId, customerId: 'cus_01', number: '2026-0139', date: '2026-06-15', due: '2026-06-29', amount: 1452, vat: 252, status: 'Concept' },
]

const quotes: Quote[] = [
  { id: 'quo_01', companyId, customerId: 'cus_03', number: 'OFF-2026-055', amount: 6400, status: 'Verzonden', validUntil: '2026-07-18' },
  { id: 'quo_02', companyId, customerId: 'cus_01', number: 'OFF-2026-054', amount: 2800, status: 'Geaccepteerd', validUntil: '2026-07-08' },
  { id: 'quo_03', companyId, customerId: 'cus_02', number: 'OFF-2026-053', amount: 11900, status: 'Concept', validUntil: '2026-07-26' },
]

const transactions: Transaction[] = [
  { id: 'trx_01', companyId, date: '2026-07-02', description: 'Betaling factuur 2026-0141', amount: 8470, status: 'Gematcht', category: 'Omzet' },
  { id: 'trx_02', companyId, date: '2026-07-01', description: 'Google Workspace', amount: -96.8, status: 'Niet gematcht', category: 'Software' },
  { id: 'trx_03', companyId, date: '2026-06-30', description: 'Lunch klantmeeting', amount: -84.15, status: 'Niet gematcht', category: 'Representatie' },
  { id: 'trx_04', companyId, date: '2026-06-28', description: 'Kantoorhuur juli', amount: -1250, status: 'Gematcht', category: 'Huisvesting' },
]

const tasks: Task[] = [
  { id: 'task_01', companyId, title: 'Factuur 2026-0140 opvolgen', due: 'Vandaag', type: 'Factuur verlopen', done: false },
  { id: 'task_02', companyId, title: 'Bon Google Workspace verwerken', due: 'Morgen', type: 'Bon nog verwerken', done: false },
  { id: 'task_03', companyId, title: 'BTW-aangifte Q2 voorbereiden', due: '15 juli', type: 'BTW', done: false },
  { id: 'task_04', companyId, title: 'Offerte Nordbyte nabellen', due: 'Vrijdag', type: 'Offerte opvolgen', done: true },
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

const products = [
  { name: 'Adviespakket Groei', type: 'Dienst', price: 1250, vat: '21%', ledger: '8000 Omzet diensten' },
  { name: 'Maandelijkse support', type: 'Abonnement', price: 395, vat: '21%', ledger: '8020 Recurring omzet' },
  { name: 'Implementatie workshop', type: 'Dienst', price: 890, vat: '21%', ledger: '8000 Omzet diensten' },
]

const documents = [
  { supplier: 'Google Ireland', date: '2026-07-01', amount: 96.8, vat: 16.8, category: 'Software', status: 'Te verwerken' },
  { supplier: 'NS Zakelijk', date: '2026-06-29', amount: 42.4, vat: 3.5, category: 'Reiskosten', status: 'Verwerkt' },
  { supplier: 'Spaces Amsterdam', date: '2026-06-28', amount: 1250, vat: 216.94, category: 'Huisvesting', status: 'Verwerkt' },
]

const ledgerAccounts = [
  { code: '1000', name: 'Bank', type: 'Activa', balance: 38420 },
  { code: '1600', name: 'Te betalen BTW', type: 'Passiva', balance: 2786 },
  { code: '4000', name: 'Inkoopkosten', type: 'Kosten', balance: 6080 },
  { code: '8000', name: 'Omzet diensten', type: 'Omzet', balance: 15960 },
]

const plans = [
  ['NOVA Start', 'Dashboard, klanten, facturen, offertes en basisrapportages'],
  ['NOVA ZZP', 'Alles uit Start plus boekhouding, BTW, bank en bonnen'],
  ['NOVA MKB', 'Meerdere gebruikers, administraties, projecten en uitgebreide rapportages'],
  ['NOVA Enterprise', 'Rollen, audit logs, multi-company, priority support en maatwerk'],
]

const navItems = [
  ['dashboard', LayoutDashboard, 'Dashboard'],
  ['customers', Users, 'Klanten'],
  ['invoices', FileText, 'Facturen'],
  ['quotes', FileCheck2, 'Offertes'],
  ['products', Package, 'Producten'],
  ['accounting', BookOpen, 'Boekhouding'],
  ['bank', Banknote, 'Bank'],
  ['documents', FolderOpen, 'Bonnen'],
  ['vat', BadgeEuro, 'BTW'],
  ['reports', BarChart3, 'Rapportages'],
  ['tasks', ClipboardCheck, 'Taken'],
  ['settings', Settings, 'Instellingen'],
  ['subscription', CreditCard, 'Abonnement'],
] as const

const eur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })

function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0].id)
  const [menuOpen, setMenuOpen] = useState(false)
  const [invoiceRows, setInvoiceRows] = useState([
    { description: 'Adviespakket Groei', quantity: 1, price: 1250, vat: 21 },
    { description: 'Maandelijkse support', quantity: 1, price: 395, vat: 21 },
  ])

  const metrics = useMemo(() => {
    const open = invoices.filter((invoice) => invoice.status !== 'Betaald').reduce((sum, invoice) => sum + invoice.amount, 0)
    const revenue = monthlyData.at(-1)?.omzet ?? 0
    const costs = monthlyData.at(-1)?.kosten ?? 0
    return {
      open,
      revenue,
      costs,
      profit: revenue - costs,
      vatDue: 2786,
    }
  }, [])

  const currentCustomer = customers.find((customer) => customer.id === selectedCustomer) ?? customers[0]
  const invoiceTotal = invoiceRows.reduce((sum, row) => sum + row.quantity * row.price * (1 + row.vat / 100), 0)

  if (screen === 'login') {
    return <AuthScreen onLogin={() => setScreen('onboarding')} />
  }

  if (screen === 'onboarding') {
    return <OnboardingScreen onComplete={() => setScreen('dashboard')} />
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
            <strong>NOVA Demo BV</strong>
            <span>company_id: comp_nova_demo</span>
          </div>
          <ChevronDown size={16} />
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
          <strong>NOVA ZZP actief</strong>
          <span>Boekhouding, BTW en bank zijn beschikbaar.</span>
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
              <input placeholder="Zoek facturen, klanten of transacties" />
            </div>
            <button className="icon-button" aria-label="Meldingen">
              <Bell size={19} />
            </button>
          </div>
        </header>

        {screen === 'dashboard' && <Dashboard metrics={metrics} onNavigate={navigate} />}
        {screen === 'customers' && <Customers onSelect={(id) => { setSelectedCustomer(id); navigate('customer-detail') }} />}
        {screen === 'customer-detail' && <CustomerDetail customer={currentCustomer} onBack={() => navigate('customers')} />}
        {screen === 'invoices' && <Invoices onCreate={() => navigate('invoice-create')} />}
        {screen === 'invoice-create' && (
          <InvoiceCreate
            rows={invoiceRows}
            total={invoiceTotal}
            onRowsChange={setInvoiceRows}
            onBack={() => navigate('invoices')}
          />
        )}
        {screen === 'quotes' && <Quotes />}
        {screen === 'products' && <Products />}
        {screen === 'accounting' && <Accounting />}
        {screen === 'bank' && <Bank />}
        {screen === 'documents' && <Documents />}
        {screen === 'vat' && <Vat />}
        {screen === 'reports' && <Reports />}
        {screen === 'tasks' && <Tasks />}
        {screen === 'settings' && <SettingsPage />}
        {screen === 'subscription' && <Subscription />}
      </main>
    </div>
  )
}

function AuthScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="auth-page">
      <section className="auth-visual">
        <Brand />
        <h1>Welkom bij NOVA Office</h1>
        <p>Boekhouding, facturen, offertes, klanten en rapportages in een rustige SaaS-omgeving voor ondernemers.</p>
        <div className="auth-stats">
          <Metric label="Openstaande facturen" value={eur.format(7490)} />
          <Metric label="BTW te betalen" value={eur.format(2786)} />
          <Metric label="Taken open" value="3" />
        </div>
      </section>
      <section className="auth-panel">
        <p className="eyebrow">Inloggen of registreren</p>
        <h2>Start je demo-administratie</h2>
        <label>E-mailadres<input defaultValue="ondernemer@novaoffice.nl" /></label>
        <label>Wachtwoord<input defaultValue="novademo2026" type="password" /></label>
        <button className="primary full" onClick={onLogin}><LogIn size={18} /> Doorgaan</button>
        <button className="ghost full">Account aanmaken</button>
      </section>
    </div>
  )
}

function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="onboarding-page">
      <Brand />
      <section className="onboarding-grid">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h1>Richt je bedrijfsomgeving in</h1>
          <p>NOVA Office koppelt alle administratie aan een bedrijf, zodat het platform geschikt blijft voor meerdere gebruikers en administraties.</p>
          <div className="data-model">
            {['Users', 'Companies', 'Subscriptions', 'Customers', 'Invoices', 'Transactions', 'Documents', 'LedgerAccounts', 'Tasks'].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <form className="setup-form">
          <label>Bedrijfsnaam<input defaultValue="NOVA Demo BV" /></label>
          <label>KvK-nummer<input defaultValue="87124490" /></label>
          <label>BTW-nummer<input defaultValue="NL862145901B01" /></label>
          <label>Administratiepakket<select defaultValue="NOVA ZZP"><option>NOVA Start</option><option>NOVA ZZP</option><option>NOVA MKB</option><option>NOVA Enterprise</option></select></label>
          <button type="button" className="primary" onClick={onComplete}>Dashboard openen <ArrowRight size={18} /></button>
        </form>
      </section>
    </div>
  )
}

function Dashboard({ metrics, onNavigate }: { metrics: Record<string, number>; onNavigate: (screen: Screen) => void }) {
  return (
    <div className="content-grid">
      <section className="kpi-grid">
        <Metric label="Openstaande facturen" value={eur.format(metrics.open)} trend="+12%" />
        <Metric label="Omzet deze maand" value={eur.format(metrics.revenue)} trend="+8%" />
        <Metric label="Kosten deze maand" value={eur.format(metrics.costs)} trend="-3%" />
        <Metric label="Winstindicatie" value={eur.format(metrics.profit)} trend="+14%" />
        <Metric label="BTW te betalen" value={eur.format(metrics.vatDue)} trend="Q2" />
      </section>

      <section className="panel wide">
        <PanelHeader title="Financiele ontwikkeling" action="Bekijk rapportage" />
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
          <button onClick={() => onNavigate('documents')}><Upload size={18} /> Bon uploaden</button>
          <button onClick={() => onNavigate('customers')}><Users size={18} /> Klant toevoegen</button>
        </div>
      </section>

      <section className="panel">
        <PanelHeader title="Taken/to-do's" />
        <TaskList compact />
      </section>

      <section className="panel wide">
        <PanelHeader title="Laatste transacties" action="Transactie verwerken" />
        <DataTable
          columns={['Datum', 'Omschrijving', 'Categorie', 'Bedrag', 'Status']}
          rows={transactions.map((trx) => [trx.date, trx.description, trx.category, eur.format(trx.amount), <Status key={trx.id} label={trx.status} />])}
        />
      </section>
    </div>
  )
}

function Customers({ onSelect }: { onSelect: (id: string) => void }) {
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

function Invoices({ onCreate }: { onCreate: () => void }) {
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
        </div>
        <div className="line-items">
          {rows.map((row, index) => (
            <div className="line-row" key={`${row.description}-${index}`}>
              <input value={row.description} onChange={(event) => updateRow(rows, onRowsChange, index, 'description', event.target.value)} />
              <input type="number" value={row.quantity} onChange={(event) => updateRow(rows, onRowsChange, index, 'quantity', Number(event.target.value))} />
              <input type="number" value={row.price} onChange={(event) => updateRow(rows, onRowsChange, index, 'price', Number(event.target.value))} />
              <select value={row.vat} onChange={(event) => updateRow(rows, onRowsChange, index, 'vat', Number(event.target.value))}><option value={21}>21%</option><option value={9}>9%</option><option value={0}>0%</option></select>
            </div>
          ))}
        </div>
        <button className="ghost" onClick={addRow}><Plus size={17} /> Regel toevoegen</button>
      </section>
      <aside className="panel preview">
        <p className="eyebrow">PDF-preview</p>
        <h2>Factuur 2026-0143</h2>
        <div className="preview-total">{eur.format(total)}</div>
        <span>Concept</span>
        <button className="primary full">Factuur verzenden</button>
      </aside>
    </div>
  )
}

function Quotes() {
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

function Products() {
  return <SimpleTable title="Producten en diensten" action="Product toevoegen" columns={['Naam', 'Type', 'Prijs', 'BTW', 'Grootboek']} rows={products.map((item) => [item.name, item.type, eur.format(item.price), item.vat, item.ledger])} />
}

function Accounting() {
  return (
    <div className="content-grid">
      <section className="kpi-grid">
        <Metric label="Inkomsten" value={eur.format(15960)} />
        <Metric label="Uitgaven" value={eur.format(6080)} />
        <Metric label="Winst/verlies" value={eur.format(9880)} />
        <Metric label="Balans totaal" value={eur.format(38420)} />
      </section>
      <SimpleTable title="Grootboekrekeningen" columns={['Code', 'Naam', 'Type', 'Saldo']} rows={ledgerAccounts.map((account) => [account.code, account.name, account.type, eur.format(account.balance)])} />
      <section className="panel">
        <PanelHeader title="Automatische boekingsvoorstellen" />
        <div className="suggestions">
          <span><Check size={16} /> Google Workspace naar Software</span>
          <span><Check size={16} /> Lunch klantmeeting naar Representatie</span>
          <span><Check size={16} /> Betaling koppelen aan factuur 2026-0141</span>
        </div>
      </section>
    </div>
  )
}

function Bank() {
  return (
    <section className="panel">
      <PanelHeader title="Banktransacties" action="CSV importeren" />
      <div className="filters"><span>Gematcht</span><span>Niet gematcht</span><span>Datum</span><span>Bedrag</span></div>
      <DataTable columns={['Datum', 'Omschrijving', 'Categorie', 'Bedrag', 'Status', 'Actie']} rows={transactions.map((trx) => [trx.date, trx.description, trx.category, eur.format(trx.amount), <Status key={trx.id} label={trx.status} />, 'Transactie verwerken'])} />
    </section>
  )
}

function Documents() {
  return <SimpleTable title="Bonnen en documenten" action="Bon uploaden" columns={['Leverancier', 'Datum', 'Bedrag', 'BTW', 'Categorie', 'Status']} rows={documents.map((doc) => [doc.supplier, doc.date, eur.format(doc.amount), eur.format(doc.vat), doc.category, <Status key={doc.supplier} label={doc.status} />])} />
}

function Vat() {
  const vatData = [
    { name: 'BTW ontvangen', value: 4956, color: '#1877f2' },
    { name: 'BTW betaald', value: 2170, color: '#13a36f' },
    { name: 'BTW te betalen', value: 2786, color: '#f59e0b' },
  ]
  return (
    <div className="content-grid">
      <section className="kpi-grid">
        {vatData.map((item) => <Metric key={item.name} label={item.name} value={eur.format(item.value)} />)}
      </section>
      <section className="panel">
        <PanelHeader title="BTW-dashboard Q2" action="Basisrapport exporteren" />
        <div className="chart small">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={vatData} innerRadius={58} outerRadius={86} dataKey="value">
                {vatData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(value) => eur.format(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}

function Reports() {
  return (
    <div className="content-grid">
      <section className="panel wide">
        <PanelHeader title="Rapportages" action="Bekijk rapportage" />
        <div className="chart">
          <ResponsiveContainer>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => eur.format(Number(value))} />
              <Bar dataKey="omzet" fill="#1877f2" radius={[4, 4, 0, 0]} />
              <Bar dataKey="kosten" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      {['Omzet per maand', 'Kosten per maand', 'Winst/verlies', 'Openstaande facturen', 'Klantwaarde', 'BTW overzicht'].map((report) => (
        <section className="report-tile" key={report}><BarChart3 size={22} /><strong>{report}</strong><span>Gereed voor export en verdieping.</span></section>
      ))}
    </div>
  )
}

function Tasks() {
  return (
    <section className="panel">
      <PanelHeader title="Taken" action="Handmatige taak toevoegen" />
      <TaskList />
    </section>
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

function Subscription() {
  return (
    <section className="panel">
      <PanelHeader title="Abonnement en pakketbeheer" />
      <div className="plans">
        {plans.map(([name, text]) => (
          <article className={name === 'NOVA ZZP' ? 'plan active-plan' : 'plan'} key={name}>
            <h2>{name}</h2>
            <p>{text}</p>
            <button className={name === 'NOVA ZZP' ? 'primary full' : 'ghost full'}>{name === 'NOVA ZZP' ? 'Huidig pakket' : 'Pakket bekijken'}</button>
          </article>
        ))}
      </div>
    </section>
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

function SimpleTable({ title, action, columns, rows }: { title: string; action?: string; columns: string[]; rows: ReactNode[][] }) {
  return <section className="panel"><PanelHeader title={title} action={action} /><DataTable columns={columns} rows={rows} /></section>
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

function TaskList({ compact = false }: { compact?: boolean }) {
  return <div className="task-list">{tasks.slice(0, compact ? 4 : tasks.length).map((task) => <div className={task.done ? 'task done' : 'task'} key={task.id}><span>{task.done && <Check size={13} />}</span><div><strong>{task.title}</strong><small>{task.type} · {task.due}</small></div></div>)}</div>
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
    products: 'Producten en diensten',
    accounting: 'Boekhouding',
    bank: 'Banktransacties',
    documents: 'Bonnen en documenten',
    vat: 'BTW-dashboard',
    reports: 'Rapportages',
    tasks: 'Taken',
    settings: 'Instellingen',
    subscription: 'Abonnement',
  }
  return titles[screen]
}

export default App
