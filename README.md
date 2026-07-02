# NOVA Office

NOVA Office is een moderne SaaS-webapp voor ondernemers. De eerste ontwikkelfase richt zich uitsluitend op de schaalbare fundering: authenticatie, multi-tenant bedrijvenbeheer, dashboard, klanten, facturen, offertes, databasecontract, rollen en design-system.

De eerste versie is een werkende MVP met demo-data, gericht op structuur, snelheid, heldere navigatie en een premium zakelijke gebruikerservaring.

## Fase 1: MVP-fundering

Deze fase bouwt nog geen boekhouding, bankkoppelingen of AI-processen. Die modules komen pas nadat de fundering stabiel is.

Scope:

- Registreren, inloggen en wachtwoord vergeten
- Multi-tenant architectuur waarin een gebruiker meerdere bedrijven kan beheren
- Dashboard voor de actieve tenant
- Klantenoverzicht en klantdetail
- Factuuroverzicht en factuur aanmaken
- Offerteoverzicht
- Databasecontract voor de fundering
- Rollen- en rechtenstructuur
- Design-system/componentenbasis

## Module-notities

### Facturen

De factuurmodule ondersteunt een eerste professionele aanmaakflow met klantkeuze, automatisch factuurnummer, factuurdatum, vervaldatum, betalingstermijn, status, factuurregels, BTW-keuze, subtotalen en PDF-preview.

Volgende uitbreidingen:

- Factuur opslaan in state/backend
- PDF genereren
- Betaling registreren
- Herinneringen automatisch voorbereiden
- Factuurregels voorstellen op basis van klant, offerte of uren zodra AI in een latere fase wordt geactiveerd

## SaaS-architectuur

De app is voorbereid op multi-tenant gebruik. Alle demo-entiteiten bevatten een `companyId`, zodat iedere administratie gekoppeld kan worden aan een bedrijf.

Fase-1 kernentiteiten:

- Users
- Companies
- CompanyMemberships
- Roles
- Customers
- Invoices
- InvoiceItems
- Quotes
- QuoteItems
- AuditEvents

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

Live development draait via GitHub Actions, GitHub Pages en Cloud86/Plesk Git.

Na iedere push naar `main`:

1. Dependencies worden geinstalleerd
2. Linting draait
3. De productiebuild wordt gemaakt
4. De laatste versie wordt gepubliceerd naar de `gh-pages` branch
5. Cloud86/Plesk haalt de `gh-pages` branch op en publiceert naar het subdomein

Live omgevingen:

- Cloud86 development: <https://nova-office.muldersign.nl>
- GitHub Pages preview: <https://muldersign.github.io/nova-office/>

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
