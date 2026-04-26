# Pip-Boy 3000 — Fallout RPG Character Manager

> A backendless, offline-first PWA for managing characters in **Fallout: The Roleplaying Game** (Modiphius / 2d20 system).
> Live at **[fallout.matpb.com](https://fallout.matpb.com)**.

```
╔══════════════════════════════════════════════════════════╗
║  PIP-BOY 3000 MK IV — RobCo Industries (TM)              ║
║  UNIFIED OPERATING SYSTEM v2.4.1                         ║
╠══════════════════════════════════════════════════════════╣
║  > NO BACKEND. NO ACCOUNTS. NO TELEMETRY.                ║
║  > Your characters live in YOUR browser's IndexedDB.     ║
║  > Backup & restore via plain JSON files.                ║
║  > Installable as a PWA (add to home screen).            ║
╚══════════════════════════════════════════════════════════╝
```

## Features

- **Six core origins**: Brotherhood Initiate, Ghoul, Super Mutant, Mister Handy, Survivor, Vault Dweller — each with its own trait and SPECIAL constraints.
- **Six-step character creator**: Origin → SPECIAL → Tag Skills + Skills → Perk → Trinket/Notes → Confirm.
- **Full character sheet** with auto-derived stats: HP, Defense, Initiative, Carry Weight, Melee CD bonus, Luck Points, Skill TNs.
- **Inventory** with weight tracking and over-encumbrance highlight.
- **Print mode** strips the CRT effects and prints a clean physical character sheet.
- **Backup / Restore** via JSON files, powered by `dexie-export-import`. Merge or replace modes.
- **PWA install**: works offline, installable on any modern browser, dark Pip-Boy theme respects `prefers-color-scheme`.
- **Pure SPA static site** — host anywhere, no server needed.

## Tech stack

- [SvelteKit 2](https://svelte.dev/) + [Svelte 5 runes](https://svelte.dev/docs/svelte/what-are-runes) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) for the Pip-Boy theme
- [Dexie](https://dexie.org/) for IndexedDB
- [@vite-pwa/sveltekit](https://vite-pwa-org.netlify.app/frameworks/sveltekit) for the service worker + manifest
- `@sveltejs/adapter-static` → fully static output, deployed on **Cloudflare Pages**

## Local development

```sh
npm install
npm run dev          # dev server with HMR
npm run check        # svelte-check (TS + Svelte)
npm run build        # production build → build/
npm run preview      # serve build/ locally
npm run test:e2e     # run Playwright headless e2e suite (needs preview running)
```

To run the full CI flow locally:

```sh
npm run check && npm run build
# in one terminal:
npm run preview -- --port 4173
# in another:
npm run test:e2e
```

## Deployment

Deployed on **[Cloudflare Pages](https://pages.cloudflare.com/)** via GitHub Actions:

- Every push to `main` deploys to production (`fallout.matpb.com`)
- Every PR builds a preview at `<branch>.fallout-n8s.pages.dev`
- Build command: `npm run build`, output: `build/`
- Node 22, ~40s end-to-end

Required repo secrets: `CLOUDFLARE_API_TOKEN` (with Account → Cloudflare Pages → Edit + Zone → DNS → Edit) and `CLOUDFLARE_ACCOUNT_ID`.

Custom domain `fallout.matpb.com` is a proxied CNAME → `fallout-n8s.pages.dev` in Cloudflare DNS.

## Disclaimer

Fallout, S.P.E.C.I.A.L., the Pip-Boy aesthetic and related marks are trademarks of Bethesda Softworks LLC. The 2d20 system is © Modiphius Entertainment. This is an **unofficial fan tool** built for personal use at the table; no copyrighted text from the rulebook is reproduced here. You'll still need a copy of *Fallout: The Roleplaying Game* Core Rulebook to play.

## License

MIT. Fork it, mod it, install it on your bunker laptop.
