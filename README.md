# ES-Digital – første fungerende app

En installerbar PWA til kundestyring, opgaver, ændringsforslag, fornyelser og manuel økonomioversigt. **FE Leasing er oprettet som første kunde.**

## Start lokalt

1. Installer Node.js 20 eller nyere.
2. Åbn terminalen i mappen.
3. Kør `ADMIN_PASSWORD='din-stærke-adgangskode' SESSION_SECRET='lang-tilfældig-værdi' npm start` (Windows: sæt miljøvariablerne separat).
4. Åbn http://localhost:3000.

Hvis ingen ADMIN_PASSWORD er angivet, bruges **demo-kun-lokalt**. Brug ALDRIG standardkoden på internettet.

## Installer på iPhone

Når appen er udgivet på en sikker HTTPS-adresse, åbn den i Safari → Del → Føj til hjemmeskærm. Den åbner derefter som en app.

## Hvad virker

- Adgangskodebeskyttet dashboard og session
- Gemte kundeprofiler med FE Leasing som første kunde
- Kundeoprettelse og ændringer, status, abonnementspris, fornyelsesdato
- Opgaver og afslutning af opgaver
- Ændringsforslag og godkendelse (kun intern registrering)
- Manuel registrering af indtægter og omsætningsoversigt
- PWA-manifest, ikon og basal offline cache for appfiler
- Persistente data i `data/store.json`

## Hvad er ikke tilsluttet

- Ingen OpenAI API/AI-chat. Det kræver en server-side API-integration, API-nøgle og forbrugsbudget.
- Ingen livepublicering til feleasing.dk. Det kræver ejerens tilladelse, hosting-/CMS-adgang og en godkendt udgivelsesintegration.
- Ingen automatisk domæneovervågning, betalingsintegration, tysk bilfeed eller fakturering.
- Ikke produktionshærdet til mange kunder. Før offentlig lancering: stærk loginløsning med MFA, brugerroller, revisionslog, backup, database med adgangskontrol, rate limiting, CSRF-beskyttelse, korrekt sessionslager, privatlivspolitik og sikker hosting. Appen bør ikke åbnes offentligt, før dette er på plads.

## Data

`data/store.json` oprettes automatisk ved første start. Lav backup af filen. Der er ikke indsat fiktive abonnementstal eller betalingsdatoer for FE Leasing.
