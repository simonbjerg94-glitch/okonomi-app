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
