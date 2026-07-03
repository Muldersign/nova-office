# Brenqo

Brenqo is een moderne SaaS-webapp voor ondernemers. De MVP-fundering richt zich op echte SaaS-basis: authenticatie, multi-tenant bedrijvenbeheer, klanten, producten/diensten, facturen, offertes, teamrollen, bedrijfsinstellingen, documentoutput en een voorbereid database/API-contract.

## Huidige Scope

- Registreren, inloggen en wachtwoord vergeten
- Multi-tenant architectuur waarin een gebruiker meerdere bedrijven kan beheren
- Dashboard voor de actieve administratie
- Klantenbeheer
- Producten en diensten
- Facturen en offertes met productregels, statusflow, dupliceren, bewerken en verwijderen
- Teamleden uitnodigen en rollen wijzigen
- Bedrijfsinstellingen per administratie
- HTML-documentdownloads voor facturen en offertes
- Backend/API-contracten en SQL-migraties
- Workspace adapter als tussenlaag richting Supabase

## Merk En Bedrijfsbasis

Appnaam: Brenqo

Eerste administratie:

- Muldersign
- KvK: 88373630
- BTW: NL004592528B88
- Adres: De Kolk 10, 9656PJ Spijkerboor
- Telefoon: +31 (0) 639232306
- E-mail: administratie@muldersign.nl
- IBAN: NL94 RABO 0338 4823 85
- BIC: RABONL2U

## Supabase

Supabase is gekozen voor de volgende MVP-stap: echte auth + database. Maak lokaal een `.env` op basis van `.env.example`:

```bash
VITE_SUPABASE_URL=https://iwgdsinkprrfarrxrpik.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
VITE_APP_NAME=Brenqo
VITE_APP_DOMAIN=https://brenqo.nl
VITE_MAIL_FROM=send@brenqo.nl
```

Het gekoppelde Supabase-project is `iwgdsinkprrfarrxrpik`. De anon public key mag in frontend-builds gebruikt worden. Zet geen wachtwoorden, SMTP-passwords of service-role keys in Git. Die horen later in Cloud86/Plesk of Supabase secrets.

Voer voor de echte databasefundering de migratie uit in de Supabase SQL editor:

```bash
database/migrations/002_supabase_auth_rls.sql
```

Deze migratie maakt Supabase Auth-profielen, bedrijven, memberships, instellingen, klanten, producten, facturen, offertes, regels, audit events en RLS-policies aan. Nieuwe registraties gebruiken daarna `bootstrap_workspace` om automatisch een eerste bedrijf en eigenaarrol klaar te zetten.

## Development

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

## Deployment

Na iedere push naar `main`:

1. Dependencies worden geinstalleerd
2. Linting draait
3. Tests draaien
4. De productiebuild wordt gemaakt
5. De laatste versie wordt gepubliceerd naar `gh-pages`
6. Cloud86/Plesk publiceert de nieuwste build

Live:

- Productiedomein: https://brenqo.nl
- Tijdelijke oude omgeving: https://nova-office.muldersign.nl

Cloud86/Plesk moet voor `brenqo.nl` dezelfde `gh-pages` build publiceren als de tijdelijke omgeving. De repository publiceert automatisch een `CNAME` voor `brenqo.nl`; zet in Plesk de document root of Git deployment van `brenqo.nl` op de laatste `gh-pages` build.

## Referentieonderzoek

Jortt mag uitsluitend functioneel worden gebruikt als referentie voor flows, navigatie en boekhoudprocessen. Brenqo behoudt een eigen merkidentiteit, codebase, interactiepatronen en visuele stijl.
