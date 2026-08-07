# CLAUDE.md — Bundle site (ZW-FS-001)

Explainer site + fully operable prototype for **Bundle**, a feature proposal for Claude
published by the Zugzwang Foundation. The source of truth is the specification at
`public/Bundle_ZW-FS-001_v1_0.pdf` (linked throughout the site). This file maps that
spec to this codebase so future work stays faithful to it.

Independent proposal — the Foundation is **not affiliated with or endorsed by Anthropic**.
The non-affiliation disclaimer in the landing footer must never be removed.

## Commands

```
npm run dev       # Vite dev server
npm run build     # production build → dist/
npm run preview   # serve the build
npm test          # state-machine tests: journeys J-1..J-7 + acceptance criteria
npm run smoke     # SSR-renders both routes, asserts key content
```

Run `npm test && npm run smoke && npm run build` before considering any change done.

## Architecture

Two routes (React Router, `BrowserRouter`):

- `/` — **Landing** (`src/pages/Landing.jsx`) — the explainer, styled as the spec
  document brought to life. Section components in `src/components/landing/`.
- `/prototype` — **Prototype** (`src/pages/Prototype.jsx`) — a full-screen, operable
  recreation of Claude's chat index with Bundle implemented. Components in
  `src/components/proto/`.

### Two visual worlds (do not mix)

| World | Prefix | Where | Palette |
|---|---|---|---|
| Document (Zugzwang spec) | `zw-`, `dr-` | landing, prototype top bar, demo rail | ink `#131211`, bone `#efece4`, gold spark `#e2b96f`, IBM Plex Mono labels |
| Product (Claude habitat) | `cl-` | everything inside an app frame / figure card | `#262624` bg, `#1f1e1c` sidebar, coral `#d97757`, warm greys |

Tokens live in `src/styles/base.css`. The spark ✦ (`Icons.jsx → Spark`) is the only
element that crosses worlds. Document-world chrome must never leak inside the `.cl-app`
frame, and vice versa. Type is one family in three voices: Archivo Variable
(`font-stretch` ~118% + weight 800 for display; normal for UI/body) + IBM Plex Mono
for utility labels.

### State (`src/state/store.jsx`)

Single reducer + context (`BundleProvider`, `useBundle`). Phases:
`off | generating | ready | thin | failed | paused`. Corrections — `names`, `removed`,
`hidden`, `collapsed` — persist across toggle-off/on and memory pauses (§11, Q2, J-6).

`selectIndex(state)` is the **only** derivation of bundles + list, consumed by both the
sidebar and the Chats and tasks page — that is how A13 ("the two surfaces always
agree") is enforced. Never derive bundle membership anywhere else.

Timers (generation, toast auto-dismiss, join highlight) live in `BundleProvider`
effects. Generation is `runId`-guarded so a stale timer can't resolve a newer run.

### Animation

framer-motion. Chat rows carry `layoutId` = `` `${surface}-${chat.id}` `` (`m-` main,
`s-` sidebar, `mini-` landing demo) inside one `LayoutGroup` per surface scope — this
is what makes rows *fly* from the flat list into bundle sections on formation, and
back on hide/remove. If you add a surface, add a new prefix. Reduced motion is
respected (framer `useReducedMotion` in the hero + CSS media query).

## Spec ↔ code map

| Spec | Where implemented |
|---|---|
| §7 toggle, one preference two surfaces (A13) | `ChatsPage.jsx` controls + `Sidebar.jsx` Recents header (mini `Toggle`), both dispatch `TOGGLE_BUNDLE`, both read `selectIndex` |
| §7.1 anatomy (chevron/name/count/spark/menu/rows) | `Rows.jsx → BundleSection`, `Menus.jsx` |
| §7.2 formation standard, no residue bucket | `data/chats.js` concerns + `selectIndex` (ungrouped chats just stay in `listChats`); candidacy is `isBundleCandidate` in `store.jsx` |
| J-1 turn on → skeletons → formation | `TOGGLE_BUNDLE` → `generating` (2.2 s) → `GENERATION_DONE`; `ChatsPage.jsx → Skeletons` |
| J-2 new chat joins | `NEW_CHAT` (Demo rail), `INCOMING_CHATS`, highlight via `highlightId` |
| J-3 rename inline, never overwritten | `Rows.jsx → RenameField`, `COMMIT_RENAME`, `names` map wins in `selectIndex` |
| J-4 remove + undo, removal remembered | `REMOVE_FROM_BUNDLE` / `UNDO_REMOVE`, `removed` map |
| J-5 hide: confirm → toast undo, stays hidden | `Menus.jsx` → `Dialogs` (Overlays.jsx) → `HIDE_BUNDLE` / `UNDO_HIDE` |
| J-6 off means off; on resumes | `TOGGLE_BUNDLE` branch (`everFormed` → straight to `ready`) |
| J-7 memory dependency | `TOGGLE_MEMORY` (pause/resume via `pausedFrom`); disabled toggle + sentence in `ChatsPage.jsx`; door opens `SettingsPopover` |
| §9 six states | `ChatsPage.jsx` (`Skeletons`, `StateCard`s, note) — the chronological list renders in every one of them (INV-1) |
| §10 sensitive names | Landing `Sensitive` section (behavioural rules are about generation, which the demo fakes; the Health card depicts R1/R3) |
| §11 stability | bundle sort by latest activity, rows newest-first, corrections permanent — all in `selectIndex` + reducer |
| §12 acceptance criteria | `scripts/statetest.js` asserts A1, A3-ish, A7–A10, A12–A14 against the reducer |
| §13 out of scope | inert menu items / nav dispatch a toast; mobile notice on `/prototype` |
| Fig. 6 row menu grammar | `Menus.jsx` — Remove from bundle appears only while bundled, shortcut **B** works while the menu is open |

## The copy register — IMMUTABLE strings (§9.1)

These strings are verbatim from the spec. Never rephrase, retitle, or "improve" them:

- Toggle: `Bundle chats`
- Tooltip: `Group related chats into bundles you can rename, edit, or hide.`
- Generating: `Finding related chats…`
- First formation note: `Bundled by Claude. Rename, remove chats, or hide any bundle.`
- Thin history: `Bundles will appear once you have a few chats about the same thing.`
- Memory dependency: `Bundle uses memory to understand your chats. Turn on memory to bundle them.`
- Bundle menu: `Rename bundle` · `Hide bundle` (two verbs, nothing else, ever)
- Row menu addition: `Remove from bundle` (shortcut B)
- Hide confirmation: `Hide this bundle? Your chats stay in your list. The bundle just stops appearing.` — buttons `Cancel` / `Hide bundle`
- Toasts: `Removed from bundle.` Undo · `Bundle hidden.` Undo
- Failure: `Claude couldn’t bundle your chats. Your list is unchanged.` — button `Try again`

## Invariants as engineering constraints

1. **INV-1** — bundles render *above* `listChats`, never instead of; every phase keeps
   the list mounted.
2. **INV-2** — no reducer action on a bundle may mutate, remove, or reorder chat data.
   Only `DELETE_CHAT` (the pre-existing product behaviour, A14) removes a chat. The
   derivation is held to the same standard: `selectIndex` is **total**, so every chat
   appears exactly once across `bundles` + `listChats` + `projects`. Project sections are
   derived from the chats' own `project` values for that reason — a fixed list of project
   names silently drops chats in any project it does not name.
3. **INV-3** — rename/remove/hide each ≤ 2 clicks from the bundle name; `names[key]`
   always outranks the generated default.
4. **INV-4** — project chats and incognito chats never enter bundle membership; memory
   off ⇒ never bundled. Enforced in two places on purpose: `isBundleCandidate(chat)` is
   the single stated candidacy rule (§7.2) and bundles are built only from chats that
   pass it, while `showBundles` tests `state.memoryOn` **directly** rather than inferring
   it from `phase` — and `TOGGLE_BUNDLE`, `RETRY`, and `GENERATION_DONE` each refuse to
   run or resolve with memory off, so no sequence reaches `ready` while it is off.
   Never rebuild membership from `nonProject`: that variable is computed for the list,
   where excluding project chats is a side effect rather than the rule.

## Resolved ambiguities (decisions already made — keep them)

- **"All chats" shows the remainder**, not a duplicate of bundled chats — per Fig. 3
  and Fig. 7 (removed chats and hidden bundles' chats return to it). A3's "still
  reachable" is satisfied by expansion, hide, remove, and toggle-off.
- A bundle whose last chat is removed/deleted simply disappears (no empty section).
- On first formation, Retirement planning is expanded; the others start collapsed
  (Fig. 3). Collapse state persists per bundle thereafter.
- Generation takes 2.2 s (1.1 s on the fresh account) — long enough to read
  "Finding related chats…", short enough to feel like a view.
- The delete-confirmation copy is prototype-scaffolding wording (delete is today's
  product behaviour, not Bundle's; the spec provides no string for it).
- Demo rail, top bar, and journeys checklist are **demo scaffolding**, visually part of
  the document world — they are not part of the proposal and must stay outside the
  `.cl-app` frame.

## Deployment

SPA on any static host. `public/_redirects` covers Netlify; Vercel/Cloudflare Pages
auto-detect Vite SPAs. For GitHub Pages either add the 404 redirect hack or switch
`BrowserRouter` → `HashRouter` in `src/main.jsx`. The PDF ships at
`/Bundle_ZW-FS-001_v1_0.pdf` — keep the filename; three places link to it.
