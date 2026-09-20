# Bundle — a toggle on Claude's chat index

Companion site, operable prototype and v0.2 demo for **ZW-FS-001 · Bundle**, a feature
specification for Claude published by the Zugzwang Foundation: automatic, reversible
grouping for scattered conversations.

Off, nothing changes. On, scattered chats about the same ongoing concern gather into
named, collapsible sections above the chronological list. A bundle is a view, not a move.

## Links

| What | Where |
|---|---|
| Live site (explainer) | https://zugzwang-claude-bundle.in |
| Live prototype (operable, with a real Claude chat) | https://zugzwang-claude-bundle.in/prototype |
| Pitch deck (HTML, arrow keys to navigate) | https://zugzwang-claude-bundle.in/pitch.html · [source](public/pitch.html) |
| Specification ZW-FS-001 v1.0 (PDF) | https://zugzwang-claude-bundle.in/Bundle_ZW-FS-001_v1_0.pdf · [in repo](public/Bundle_ZW-FS-001_v1_0.pdf) |
| v0.2 product + technical handover | [docs/HANDOVER_v0.2.md](docs/HANDOVER_v0.2.md) |
| Working brief for continued development | [CLAUDE.md](CLAUDE.md) |
| Repository | https://github.com/Zugzwang-world/bundle |
| Build-day mirror (same history) | https://github.com/Zugzwang-world/bundle-v0.2 |

## The four invariants

1. **INV-1** The list is never replaced. Bundles sit above it; the chronological list stays beneath.
2. **INV-2** A bundle never moves a chat. Every chat appears exactly once.
3. **INV-3** Every generated name is correctable and safety-filtered. A health scare renders as `Health`, never a condition.
4. **INV-4** Bundle sees only what memory already sees. Memory off, no bundles.

## What is real and what is simulated (v0.2, build day 2026-09-20)

| Piece | Status |
|---|---|
| The toggle, six states, rename / remove / hide with Undo, off→on resume, J-1…J-7 | **Real**, tested by `npm test` |
| A new chat: Claude replies, then writes the chat's card (title + summary) | **Real** — `claude-fable-5-1` via the Messages API |
| Placement of the new chat into a bundle, with runner-up and a one-line reason | **Interim** — Claude picks among the known concerns inside the card call |
| Bundle formation for the 36 fixture chats | **Simulated** — the fixture groups are hard-coded; the 2.2 s "generating" state is a timer |
| Browser-side embeddings, clustering, formation rules, naming, safety gate, stage view | **Not built yet** — specified in [docs/HANDOVER_v0.2.md](docs/HANDOVER_v0.2.md) |

## Quickstart

```bash
npm install
cp .env.example .env    # optional: add VITE_ANTHROPIC_API_KEY for the live chat in dev
npm run dev             # http://localhost:5173
```

Open `/prototype`. In the demo rail, the **New chat** composer sends a message to Claude,
shows the card it writes, and adds the chat to the list. Flip **Bundle chats** to see it
land in its bundle.

| Script | What it does |
|---|---|
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | State-machine tests — journeys + acceptance criteria against the reducer |
| `npm run smoke` | SSR-renders both routes and asserts key content |

## How the API key is handled

- **Local dev:** `VITE_ANTHROPIC_API_KEY` in `.env` (gitignored). The browser calls
  `api.anthropic.com` directly. Vite inlines `VITE_*` values into the bundle, so a build
  made with `.env` present must never be deployed.
- **Deployed site:** the client calls `/api/messages`, a Netlify function
  ([netlify/functions/messages.mjs](netlify/functions/messages.mjs)) that reads
  `ANTHROPIC_API_KEY` from the Netlify environment. The key never reaches the browser.
- The client picks the mode automatically: direct when a local `VITE_` key exists,
  proxy otherwise ([src/engine/anthropic.js](src/engine/anthropic.js)).

## Deploying

```bash
netlify env:set ANTHROPIC_API_KEY sk-ant-... --secret --context production
mv .env .env.parked && npm run build && mv .env.parked .env   # build without the local key
grep -c sk-ant- dist/assets/*.js                               # must print 0
netlify deploy --prod --dir=dist
```

## Structure

```
public/Bundle_ZW-FS-001_v1_0.pdf   the specification (linked from the site)
public/pitch.html                  the pitch deck
docs/HANDOVER_v0.2.md              product + technical handover for v0.2
netlify/functions/messages.mjs     server-side proxy for the Messages API
src/
  engine/                anthropic.js (fetch wrapper) · reply.js · card.js
  data/chats.js          Meera's four months, fresh-account data, incoming chats
  state/store.jsx        reducer + provider + selectIndex (one derivation, both surfaces)
  components/landing/    hero gather animation, live mini-demo, all sections
  components/proto/      sidebar, chats page, bundle sections, menus, dialogs, demo rail, live chat
  pages/                 Landing, Prototype
  styles/                base tokens · landing (document world) · proto (Claude habitat)
scripts/                 statetest.js + smoke.jsx (run via npm test / npm run smoke)
CLAUDE.md                build brief: spec↔code map, immutable copy register, constraints
```

## Credits

Specification and site © 2026 The Zugzwang Foundation · zugzwangworld.com

An independent proposal. The Zugzwang Foundation is not affiliated with, commissioned
by, or endorsed by Anthropic. "Claude" is used nominatively to name the product this
proposal addresses; all interface depictions are illustrative reconstructions, not
screenshots.
