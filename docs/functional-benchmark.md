# Functionele Benchmark

Deze notities vertalen functionele observaties uit Jortt naar een eigen Brenqo-richting. Jortt wordt uitsluitend gebruikt om boekhoudflows, schermopbouw en gebruikersvragen te begrijpen. Brenqo kopieert geen code, teksten, visuals, kleuren, iconen, layouts of componenten.

## Productprincipe

Brenqo moet voelen als een besturingssysteem voor ondernemers, niet als een klassiek boekhoudpakket. De kern is een werkruimte die laat zien wat vandaag aandacht nodig heeft, wat automatisch kan worden afgehandeld en welke acties de gebruiker met minimale klikken kan afronden.

## Wat We Leren Uit De Referentie

### Werkruimte En Dashboard

- Een centrale startpagina werkt goed wanneer die direct taken, status en financiele signalen combineert.
- Losse blokken voor actiepunten, facturen, btw, winst en bank geven snel overzicht.
- Een persoonlijke onboardinglaag helpt nieuwe gebruikers beter dan een lege applicatie.
- Statuskaarten moeten klikbaar zijn en direct naar de juiste vervolgactie gaan.

Brenqo-vertaling:

- Startscherm heet `Werkruimte`.
- Bovenaan komt een compacte dagagenda met acties zoals offertes opvolgen, facturen versturen, btw-deadlines en documenten verwerken.
- Financiele kaarten tonen naast bedragen altijd context: vergelijking, deadline, risico of volgende stap.
- AI-suggesties worden per kaart en per flow aangeboden, niet als losse module.

### Onboarding

- Een checklist verlaagt frictie bij de eerste inrichting.
- Taken kunnen logisch worden gegroepeerd: account afronden, verkoop starten, boekhouding voorbereiden.
- Elke taak moet een directe actieknop hebben.

Brenqo-vertaling:

- Onboarding wordt een `Snel starten`-paneel in de Werkruimte.
- Taken worden persoonlijk: bedrijfsgegevens aanvullen, eerste klant toevoegen, factuursjabloon kiezen, eerste factuur maken.
- Taken mogen weggeklikt worden, maar blijven via instellingen of help opnieuw vindbaar.

### Navigatie

- Een vaste linker navigatie geeft rust.
- Te veel losse boekhoudbegrippen maken het product zwaarder dan nodig.
- Groepering maakt de app beter scanbaar.

Brenqo-vertaling:

- Navigatie blijft gegroepeerd rond `Vandaag`, `Verkoop`, `Financien`, `Werkruimte`, `Beheer` en `Systeem`.
- Rollen zitten onder `Team`.
- Bedrijven heten `Werkruimtes`.
- Boekhoudmodules worden pas zichtbaar wanneer ze functioneel genoeg zijn.

### Klanten En Groepen

- Klantenbeheer vraagt meer dan naam en e-mail: factuuradres, KvK, btw, Peppol, factuurmail, betaalafspraken en klantgroepen.
- Een zijpaneel voor aanmaken/bewerken houdt context zichtbaar.
- Klantgroepen zijn nuttig voor periodieke facturen en rapportages.

Brenqo-vertaling:

- Klanten krijgen gefaseerde detailvelden: basisgegevens eerst, daarna facturatie, Peppol, betaalafspraken en labels.
- Klantgroepen worden een eigen laag bovenop klanten, bruikbaar voor bulkfacturatie en segmentrapportages.
- AI kan KvK/IBAN/e-mailadres herkennen en invulvoorstellen doen.

### Facturen En Offertes

- Het factuurproces werkt goed wanneer lijst en detail naast elkaar kunnen bestaan.
- Conceptstatus, ontbrekende gegevens en verzendblokkades moeten expliciet zichtbaar zijn.
- Factuurnummering, vervaldatum, klant, regels, opmerkingen en verzendstatus horen in een begeleide flow.
- Documentopmaak is belangrijk, maar mag de factuurflow niet vertragen.

Brenqo-vertaling:

- Factuur en offerte krijgen een split-view: links overzicht, rechts detail/editor.
- Brenqo toont een duidelijke `Klaar om te versturen`-score.
- Ontbrekende gegevens worden omgezet naar klikbare herstelacties.
- PDF, voorbeeld, verzendmail en herinnering worden server-side voorbereid.

### Documentopmaak

- Een visuele editor voor factuur- en offerte-opmaak geeft vertrouwen.
- Gebruikers denken in onderdelen: logo, klantblok, regels, totalen, betaalinstructies, vrije tekst.

Brenqo-vertaling:

- Documenttemplates krijgen blokken, maar de editor blijft eenvoudiger en moderner.
- Eerst komen vaste professionele templates, daarna pas volledige vrije layout.
- Elk template moet direct PDF-proof zijn.

### Boekingen En Bonnen

- Handmatige boekingen hebben categorie, omschrijving, bedrag, btw, datum en eventueel bijlage nodig.
- Tabs voor opbrengsten, kosten, bedrijfsmiddel en balans helpen boekingen structureren.
- Upload/dropzone voor bonnen is essentieel.

Brenqo-vertaling:

- Bonnen en inkoopfacturen worden later een AI-first uploadflow.
- De gebruiker uploadt of sleept een document, Brenqo stelt boeking, btw en koppeling voor.
- Handmatige boeking blijft beschikbaar als fallback.

### Btw En Boekhoudcontrole

- Een controlelijst geeft vertrouwen voordat btw-aangifte wordt gedaan.
- Groene checks maken duidelijk wat al veilig is.
- Periodeselectie is noodzakelijk.

Brenqo-vertaling:

- Btw krijgt een `Voorbereiden`-flow met controles, risico's en AI-uitleg.
- Brenqo zegt niet alleen dat iets klopt, maar ook waarom.
- Bij afwijkingen moet de gebruiker direct naar de juiste factuur, boeking of betaling kunnen springen.

### Rapportages

- Standaardrapporten moeten vindbaar zijn zonder dat de gebruiker boekhoudtaal hoeft te kennen.
- Rapporten moeten gegroepeerd worden naar doel: winst, balans, btw, klanten, cashflow en jaarwerk.
- Betaalde of toekomstige rapporten kunnen zichtbaar zijn, maar mogen de MVP niet vervuilen.

Brenqo-vertaling:

- Rapportages worden taakgericht benoemd: `Hoe staat mijn bedrijf ervoor?`, `Welke klanten betalen laat?`, `Wat moet ik aan btw reserveren?`.
- Klassieke namen blijven secundair voor herkenning.
- AI kan rapporten samenvatten in gewone taal.

## MVP-Prioriteiten Uit Deze Benchmark

1. Werkruimte uitbreiden met onboarding, taken en financieel overzicht.
2. Klantenbeheer uitbreiden met facturatievelden, labels en klantgroepen.
3. Facturen/offertes ombouwen naar split-view met conceptstatus en herstelacties.
4. Documenttemplates en server-side PDF afronden.
5. Rapportages als eerste leesbare inzichten toevoegen.
6. Boekingen, btw, bank en AI-automatisering pas daarna verder uitbouwen.

## Niet Kopieren

- Geen Jortt-teksten, illustraties, logo's, iconen, kleuren of schermindelingen.
- Geen exacte menuvolgorde of componentstructuur.
- Geen HTML, CSS, database-structuren of interactiecode.
- Geen robot/mascotte-concept als merkdrager.

Brenqo blijft rustig, premium, zakelijk en AI-first.
