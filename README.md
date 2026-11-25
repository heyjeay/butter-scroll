# Butter Scroll

The krp_phone scroll feel for every website, as a Chrome extension:

- **Eased wheel glide.** Each wheel notch sets a target and the page eases toward it every frame (`1 - e^(-dt / smoothness)`, 110 ms by default). Notches that land mid-glide add onto it.
- **Rubber-band ends.** Past the top or bottom the content stretches a little, then springs back on the iOS curve. Fixed headers stay put.
- **Drag to scroll (opt-in).** Hold the mouse and throw the page like a phone, with momentum on release.

Sites that run their own smooth scrolling (Lenis, Locomotive, GSAP ScrollSmoother) keep it. So do maps and editors that handle the wheel themselves, and scroll-snap carousels. Trackpads are left alone by default. Ctrl+wheel still zooms.

## Install

```powershell
npm install
npm run build
```

Then in Chrome: `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → pick the **`dist`** folder. Only `dist` has the built popup; the manifest source is in `extension/manifest.json`, and its version comes from `package.json`. After a rebuild, press the reload icon on the extension's card.

## Develop

- `public/content.js` is the scroll engine. It's plain JS because it runs inside other people's pages. Set `debug = true` at the top for console logs.
- `src/` is the popup: Vue 3, Vite, Tailwind and Vue Router. The Home page has the switches and the Tune page has the sliders plus a test strip.
- `npm run dev`, then open `http://localhost:5173/playground/`. The playground is a test bed with a fixed header, nested scrollers, `overscroll-behavior: contain`, a snap carousel and a wide strip, plus toggles that drive the engine.
- `npm run icons` redraws `public/icons/*.png`.

Settings live in `chrome.storage.sync`. If you change `DEFAULTS`, change it in both `public/content.js` and `src/settings.js`.
