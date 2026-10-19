# Min Økonomi

Statisk PWA til personlig økonomi (dansk, DKK). Ingen build, ingen server – al data gemmes i browserens localStorage (`okonomi.v1`).

- `index.html` – app-skal
- `styles.css` – design (mørkt/lyst tema)
- `app.js` – al logik (visninger, faste poster, budget, mål, PT, abonnementer, CSV/JSON)
- `sw.js` – service worker (offline-cache). Hæv `CACHE`-versionen ved hver opdatering.
- `manifest.webmanifest`, `icons/` – installérbar app
- `vendor/chart.umd.min.js` – Chart.js 4.4.4 (lokalt, virker offline)
- `vendor/xlsx.mini.min.js` – SheetJS 0.20.3 (Apache-2.0), indlæses kun ved import af Excel-filer

Data-version 2 tilføjer **jobs** (Artrose Fys, Personlig træning, Handicapformidlingen, Airbnb). Ældre data migreres automatisk ved første indlæsning – intet slettes.

Bankimport genkender Lån & Spar Banks `Posteringsdetaljer.csv` (ingen overskrifter, `;`, UTF-8 med BOM, 16 kolonner, beløb i kolonne 5, datoer dd-mm-åååå) automatisk; andre banker kortlægges manuelt.

Kør lokalt: `python3 -m http.server 8765` i mappen og åbn http://localhost:8765.
Hosting: upload mappen som den er til en statisk host (GitHub Pages, Netlify, Vercel …). Kræver HTTPS for PWA/offline.

### v3 – gennemsyn af import og læring
- Hele importen vises før den gemmes: grupperet pr. kategori med antal og total, kategori (og job for indtægter) kan rettes pr. række, flere rækker kan markeres og ændres på én gang, hver række kan medtages/udelades, og dubletter vises som sprunget over.
- Lærte regler (`rules` i data og i JSON-backup): når du retter kategorien for en forretning under import eller senere, huskes det og går forud for de indbyggede regler. Du kan se og slette dem under Indstillinger → Lærte regler.
- Faste poster findes automatisk: forretninger der går igen hver måned med omtrent samme beløb (også set op mod tidligere posteringer) foreslås som fast post med ét tryk – uden at lave dubletter af faste poster du allerede har.
- Udvidet dansk regelsæt for forretninger. Cache `okonomi-v3`.

### v4 – Sparetips
- Ny side “Sparetips” (sidemenu + Mere) med 20 generelle danske sparetips, filter pr. emne (Hverdag, Bolig & energi, Skat, Opsparing, Gæld, Ikke gjort), “Marker som gjort ✓” gemt lokalt (`settings.tipsDone`, med i backup) og fremskridtstæller. Tips linker til Abonnementsjæger, Opsparingsmål, Budget, Mine jobs og officielle kilder. Cache `okonomi-v4`.

### v5 – Økonomiskolen og Renters rente
- “Økonomiskolen”: 50 lektioner i 10 moduler (Grundlæggende, Skat, Renters rente & investering, Pension, Gæld & lån, Bolig, Forsikring, Forbrugerret, Pengepsykologi, Sikkerhed & svindel). Indholdet ligger i `skole.js`. “Marker som læst” gemmes i `settings.lessonsRead` (med i backup), med fremskridt pr. modul. “Dagens råd” på Overblik skifter lektion hver dag.
- “Renters rente”: beregner med startbeløb, månedlig opsparing, afkast, antal år, valgfri årlige omkostninger og årlig stigning i opsparingen, købekraft (inflation), stablet graf (indskud/afkast), nøgletal og tabel år for år. Indstillingerne gemmes i `settings.calc`. Kun en illustration – ikke et løfte om afkast. Cache `okonomi-v5`.

## v6
- **Import-påmindelse**: banner på Overblik når der er gået længere end valgt interval (Indstillinger → Import: uge/14 dage/måned/fra) siden sidste import. "Udsæt 7 dage". Vises kun når appen åbnes (ingen push-notifikationer).
- **Årsoversigt til skat** (`#/aarsoversigt`): indtægter pr. job/type, fradragsrelevante poster og tjekliste pr. år, CSV-eksport og printvenlig udgave. Vejledende – tjek altid på skat.dk.
- **Hvad nu hvis** (`#/hvadnu`): ændr indkomst, ny fast udgift, engangsudgift, opsig abonnementer og skær i kategorier – se effekt på månedligt overskud og mål.
- **Nettoformue** (`#/formue`): aktiver og gæld med historik, graf og "Opdatér alle".

## v7
- **App-lås** (Indstillinger → App-lås): PIN-kode på 4–8 cifre (PBKDF2-SHA256, 600.000 iterationer, tilfældigt salt) i sin egen nøgle `okonomi.lock` (ikke med i backup).
  - Valgfri **kryptering** af alle data med AES-256-GCM (nøglen udledes af PIN-koden og ligger kun i hukommelsen; ny IV ved hver gemning). Glemt PIN = data kan kun gendannes fra backup – det advares der tydeligt om.
  - Uden kryptering er låsen en privatlivsskærm; her kan **Face ID / fingeraftryk** (passkey/WebAuthn på enheden) bruges som genvej.
  - Auto-lås: straks når appen skjules, efter 1/5/15 min. inaktivitet eller aldrig. "🔒" i topbaren låser med det samme.
  - Forkerte forsøg giver stigende ventetid – data slettes aldrig automatisk. "Glemt PIN?": gendan fra backup-fil eller slet alt (kræver at man skriver SLET).
  - Temaet gemmes i `okonomi.theme`, så låseskærmen kan vises i rigtigt tema før noget andet.
- **Minikurser** i Økonomiskolen (`#/skole`, data i `kurser.js`): 8 korte forløb i spor med trin (swipe/piletaster), quiz med forklaringer, fremdriftslinje og badges. Fremskridt gemmes i `settings.courses` og kommer med i backuppen.

## v8
- 11 nye minikurser (i alt 19) fordelt på sporene Grundlag, Livsfaser, Investering & pension, Selvstændig og Hjem & hverdag: SU og studielån, Din første lejebolig, Flytte sammen – eller gå fra hinanden, Økonomi når I får børn, Arv og testamente, A-kasse og hvis du mister jobbet, Efterløn og pensionsalder, Start en lille virksomhed, Bil eller ingen bil, Grøn økonomi i hjemmet, Snak med børn om penge. Tal er tjekket mod borger.dk, skat.dk, su.dk, bm.dk m.fl. og markeret med årstal.

## v9
- **Personlig inflation** (`#/inflation`): vægtet inflation ud fra dit eget forbrug de seneste 12 måneder × Danmarks Statistiks prisændring pr. varegruppe (PRIS01, september 2026 år over år; opdateres ikke automatisk) sammenlignet med den officielle inflation (2,2 %). Viser også eget forbrug år over år pr. kategori, når der er data for samme måneder to år i træk – ellers forklaring og regneeksempel.
- 9 nye minikurser (i alt 28) og nyt spor **Arbejdsliv**: Personlig inflation, Lovlig skatteoptimering, Forhandl din løn, Økonomisk tryghed hvis du bliver syg, Sådan læser du en investeringsfond, Ratepension vs. aldersopsparing vs. livrente, Frynsegoder og beskatning, Køb af andelsbolig eller sommerhus, Din økonomiske nødplan.
