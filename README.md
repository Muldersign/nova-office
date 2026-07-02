# NOVA Office

NOVA Office is een moderne SaaS-webapp voor ondernemers. Het platform brengt boekhouding, facturen, offertes, klanten, banktransacties, bonnen, BTW, rapportages, taken en pakketbeheer samen in een centrale omgeving.

De eerste versie is een werkende MVP met demo-data, gericht op structuur, snelheid, heldere navigatie en een premium zakelijke gebruikerservaring.

## Productrichting

NOVA Office wordt AI-first ontwikkeld. Iedere module moet op termijn handmatige administratie verminderen door slimme suggesties, automatische herkenning en contextuele acties.

Belangrijke AI-kansen:

- Automatisch boeken van inkomsten en uitgaven
- Bonnen en inkoopfacturen herkennen
- Banktransacties koppelen aan facturen
- BTW-aangifte voorbereiden
- Waarschuwingen bij verlopen facturen of ontbrekende bonnen
- Rapportages genereren in begrijpelijke taal
- Slim zoeken door de volledige administratie
- AI-chat binnen NOVA Office voor vragen en acties

## MVP-modules

- Login en registratie-entry
- Onboarding voor bedrijfsgegevens
- Dashboard met KPI's, grafieken, taken en transacties
- Klantenoverzicht en klantdetail
- Factuuroverzicht en factuur aanmaken
- Offerteoverzicht
- Producten en diensten
- Boekhouding met grootboek en boekingsvoorstellen
- Banktransacties met matchstatus
- Bonnen en documenten
- BTW-dashboard
- Rapportages
- Taken
- Instellingen
- Abonnement en pakketbeheer

## Module-notities

### Facturen

De factuurmodule ondersteunt een eerste professionele aanmaakflow met klantkeuze, automatisch factuurnummer, factuurdatum, vervaldatum, betalingstermijn, status, factuurregels, BTW-keuze, subtotalen en PDF-preview. De flow bevat ook een AI-check voor verplichte velden, BTW en betaaltermijn.

Volgende uitbreidingen:

- Factuur opslaan in state/backend
- PDF genereren
- Betaling registreren
- Herinneringen automatisch voorbereiden
- AI-voorstel voor factuurregels op basis van klant, offerte of uren

## SaaS-architectuur

De app is voorbereid op multi-tenant gebruik. Alle demo-entiteiten bevatten een `companyId`, zodat iedere administratie gekoppeld kan worden aan een bedrijf.

Kernentiteiten:

- Users
- Companies
- Subscriptions
- Customers
- Invoices
- InvoiceItems
- Quotes
- QuoteItems
- Products
- Transactions
- Expenses
- Documents
- LedgerAccounts
- Tasks
- Reports/settings

## Ontwikkelmethode

We werken in kleine iteraties:

1. Bouwen
2. Testen
3. Verbeteren
4. Committen
5. Deployen
6. Herhalen

Iedere belangrijke wijziging krijgt een duidelijke commit message. Feature branches worden gebruikt voor grotere of risicovollere wijzigingen.

## Development

Installeer dependencies:

```bash
npm install
```

Start de lokale ontwikkelomgeving:

```bash
npm run dev
```

Controleer de productiebuild:

```bash
npm run build
```

Controleer linting:

```bash
npm run lint
```

## Deployment

Deployment loopt via GitHub Actions naar GitHub Pages.

Na iedere push naar `main`:

1. Dependencies worden geinstalleerd
2. Linting draait
3. De productiebuild wordt gemaakt
4. De laatste versie wordt gepubliceerd als live preview

## Referentieonderzoek

Jortt mag uitsluitend functioneel worden gebruikt als referentie voor flows, navigatie en boekhoudprocessen.

Niet kopieren:

- Code
- HTML
- CSS
- Afbeeldingen
- Iconen
- Teksten
- Componenten
- Kleuren
- Illustraties
- Logo's
- Specifieke designs

NOVA Office behoudt een eigen merkidentiteit, interactiepatronen en visuele stijl.
