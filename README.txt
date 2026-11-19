Farida Rizki — Portfolio website
================================

Open index.html in any modern browser. Everything runs locally:
- assets/css/style.css   all styling (colours and fonts are variables at the top)
- assets/js/hero.js      falling 3D balls (Matter.js physics) + the cat whose eyes follow the cursor
- assets/js/main.js      menu, hover-to-scroll page previews, image lightbox
- assets/js/matter.min.js  physics library (bundled, no internet needed)
- assets/img/            all visuals, cropped from the PDF portfolio

Fonts (Poppins + Montserrat) load from Google Fonts when online, with system fallbacks offline.

Hero interactions: move the cursor to push the balls, drag a ball to grab and throw it,
click/tap empty space (or the "Drop a ball" button) to drop a new one.

To publish: upload the whole folder to Netlify, Vercel, GitHub Pages, or any static host.
