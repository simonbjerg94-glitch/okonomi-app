# Min Økonomi

Statisk PWA til personlig økonomi (dansk, DKK). Ingen build, ingen server – al data gemmes i browserens localStorage (`okonomi.v1`).

- `index.html` – app-skal
- `styles.css` – design (mørkt/lyst tema)
- `app.js` – al logik (visninger, faste poster, budget, mål, PT, abonnementer, CSV/JSON)
- `sw.js` – service worker (offline-cache). Hæv `CACHE`-versionen ved hver opdatering.
- `manifest.webmanifest`, `icons/` – installérbar app
- `vendor/chart.umd.min.js` – Chart.js 4.4.4 (lokalt, virker offline)

Kør lokalt: `python3 -m http.server 8765` i mappen og åbn http://localhost:8765.
Hosting: upload mappen som den er til en statisk host (GitHub Pages, Netlify, Vercel …). Kræver HTTPS for PWA/offline.
