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

## v10–v11 – Krypteret synkronisering med Google Drive
- (v10 byggede synk mod Dropbox; i v11 er det skiftet til Google Drive, og Dropbox-koden er fjernet.)
- **Indstillinger → ☁️ Synkronisering med Google Drive**: "Forbind Google Drive", status, seneste synkronisering, "🔄 Synkroniser nu", "🔑 Log ind igen" og "Afbryd forbindelse".
- Login med **Google Identity Services token-klient** i browseren (OAuth 2, ingen client secret), kun scope `https://www.googleapis.com/auth/drive.appdata`. Filen `okonomi.enc` ligger i Drives skjulte **appDataFolder**, som kun denne app kan se.
- Adgangstokens varer ca. 1 time. Udløbet token fornyes stille (`prompt: ''`), når browseren tillader det; ellers vises "Log ind igen" (i Indstillinger og som banner), og ændringer gemmes lokalt og synkroniseres efter login.
- Alle data krypteres på enheden med **AES-256-GCM** med en nøgle fra en separat **sync-adgangsfrase** (PBKDF2-SHA256, 600.000 iterationer, tilfældigt salt i filen). Adgangsfrasen kan ikke gendannes.
- Synker ved åbning, ~4 sek. efter hver ændring, ved "Synkroniser nu", når nettet kommer tilbage og når appen kommer i forgrunden.
- Fletning pr. id (posteringer, faste poster, mål og indbetalinger, jobs, regler, kategorier, formueposter og historik) mod sidst synkroniserede version; kursus-fremskridt, læste lektioner og tips samles; samme felt ændret to steder → du vælger version. Hver upload har et id + historik, så en samtidig upload fra en anden enhed opdages og flettes uden at slette noget; dobbelte filer flettes og ryddes op.
- Opsætning: indsæt OAuth Client ID i `SYNC_CONFIG.googleClientId` øverst i `sync.js`. Test: `tools/okonomi-v11-test.py` (mock af Google Identity Services + Drive API).

## v13 – Elpriser
- Ny side **Mere → ⚡ Elpriser**: day-ahead-spotpriser pr. kvarter for i dag og i morgen (fra ca. kl. 13) i et søjlediagram farvet grøn/gul/rød ift. dagens gennemsnit, med markering af "Nu".
- Prisområde DK1/DK2 (standard DK2) og visning af spotpris eller **anslået totalpris** (spot + gns. nettarif + elselskabstillæg + elafgift, plus moms – alle tal kan rettes).
- "🟢 Billig nu" når prisen er ≤ 75 % (kan rettes) af dagens eller 7-dages gennemsnit eller under en valgfri grænse i kr/kWh. Billigste 3-timers vindue i dag og i morgen med forslag (elbil, vaskemaskine, opvasker, tørretumbler) og anslået besparelse; kWh pr. gang kan rettes.
- Besked (toast + browser-notifikation efter tilladelse), når en billig periode starter – kun mens appen er åben.
- Kilde: Energi Data Service (DayAheadPrices). API'et sender kun CORS-headere til Energinets egne domæner, så fra GitHub Pages bruges reservekilden elprisenligenu.dk (samme day-ahead-priser, åben CORS); Energi Data Service prøves igen ca. hver 7. dag. Seneste priser caches offline. Test: `tools/okonomi-v13-test.py`.
- **🔭 Elpris-udsigt (7 dage)**: vejrbaseret skøn (Open-Meteo: vind i 100 m og solindstråling, gns. af 4 punkter pr. prisområde) af chancen for billig strøm (spot ≤ 0,25 kr/kWh, kan rettes) pr. dag og pr. 6 timer, med forventet prisspænd. Modellen bygger på egen 12-måneders analyse (vindintervaller, sæson, solregression) og trækkes mod en normal dag efter vindprognosens træfsikkerhed (korrelation 0,99 → 0,55 fra 1 til 7 dage). Kort med farve, smiley og sikkerhedsmærkat (Ret sikker → Næsten gætværk).

## v14 – Værktøjer
Ny hub under **Mere → Værktøjer** med: Abonnementsjæger (finder faste træk i importerede posteringer, månedlig/kvartalsvis/årlig, årlig pris, behold/opsig og samlet mulig besparelse), Månedens rapport (bladres pr. måned, sammenligning med forrige måned og et konkret tip), Sparemål med billeder (eget billede, forventet dato, konfetti ved mål), Fradrags-huskeliste (afkrydsning pr. år, links til skat.dk, kørselsfradrag med 2026-satser; øvrige satser er redigerbare felter), Regningskalender (12 måneder frem, advarsel ved tunge måneder), Elforbrug i kroner (pris nu vs. billigste tidspunkt for vask, opvask, tørretumbler og elbil, ud fra din elaftale), Pensionstjek (et groft skøn) og Udfordringer & streaks med badges. Alle data ligger i `S.settings.tools` og kommer derfor med i backup og Google Drive-synk.

## v15 – Bon-scanning
Værktøjer → **Bon-scanning** (og 📷 Bon på Posteringer). Tekstgenkendelse kører helt i browseren med Tesseract.js 7 og dansk sprogdata (`vendor/ocr/`, ~14 MB, hentes først ved første scanning og gemmes derefter offline i en separat service worker-cache). Butik, dato, total (AT BETALE / I ALT / TOTAL, danske beløb som 1.234,50) og varelinjer udfyldes og kan rettes før gem. Billedet gemmes komprimeret (JPEG) i `S.receipts`, som indgår i backup og Google Drive-synk.
En bon er et bilag – aldrig en ekstra udgift. Ved gem og ved bankimport matches den på beløb (±1 kr), dato (±3 dage) og butiksnavn: præcis ét match med samme butik knyttes automatisk (🧾 på posteringen); ellers spørger importen "Er denne bon den samme som betalingen?". Bonner uden betaling står som "afventer bank" og tæller kun med, hvis de markeres kontant; knyttes en kontant-bon senere til en bankbetaling, fjernes kontant-posteringen, så intet tælles dobbelt. Test: `tools/okonomi-v15-test.py`.
