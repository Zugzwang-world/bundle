# Bundle — explainer + operable prototype

Companion site for **ZW-FS-001 · Bundle**, a feature specification for Claude published
by the Zugzwang Foundation: automatic, reversible grouping for scattered conversations.

- **`/`** — the explainer: the spec's argument, invariants, states, and safety rules,
  set in the document's own visual language, with a live embedded mini-demo.
- **`/prototype`** — a full-screen, operable prototype of Claude's chat index with
  Bundle implemented: all seven journeys (J-1…J-7) and all six states (§9) can be
  walked, with a checklist rail that ticks them off as you go.
- The full specification ships with the site: [`/Bundle_ZW-FS-001_v1_0.pdf`](public/Bundle_ZW-FS-001_v1_0.pdf).

Everything is frontend-only. No backend, no analytics, no persistence — the "AI" that
forms bundles is a 2.2-second timer and a lookup table, which is exactly enough to
demonstrate the interaction contract the spec actually specifies.

## Quickstart

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | State-machine tests — journeys + acceptance criteria against the reducer |
| `npm run smoke` | SSR-renders both routes and asserts key content |

## Deploying

It's a static SPA — `npm run build`, then host `dist/` anywhere:

- **Netlify** — works out of the box (`public/_redirects` is included).
- **Vercel / Cloudflare Pages** — auto-detected as a Vite SPA; no config needed.
- **GitHub Pages** — either add the standard SPA 404-redirect hack, or switch
  `BrowserRouter` to `HashRouter` in `src/main.jsx`.

Point your domain at the host and you're done.

## Structure

```
public/Bundle_ZW-FS-001_v1_0.pdf   the specification (linked from the site)
src/
  data/chats.js          Meera's four months, fresh-account data, incoming chats
  state/store.jsx        reducer + provider + selectIndex (one derivation, both surfaces)
  components/landing/    hero gather animation, live mini-demo, all sections
  components/proto/      sidebar, chats page, bundle sections, menus, dialogs, demo rail
  pages/                 Landing, Prototype
  styles/                base tokens · landing (document world) · proto (Claude habitat)
scripts/                 statetest.js + smoke.jsx (run via npm test / npm run smoke)
CLAUDE.md                build brief: spec↔code map, immutable copy register, constraints
```

`CLAUDE.md` is the working brief for continued development (e.g. in Claude Code) — read
it before changing behaviour; it lists the spec strings that must stay verbatim and the
ambiguities that have already been resolved.

## Credits

Specification and site © 2026 The Zugzwang Foundation · zugzwangworld.com

An independent proposal. The Zugzwang Foundation is not affiliated with, commissioned
by, or endorsed by Anthropic. "Claude" is used nominatively to name the product this
proposal addresses; all interface depictions are illustrative reconstructions, not
screenshots.
