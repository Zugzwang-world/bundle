# Bundle v0.2 — Product and technical handover

Date: 2026-09-20 · Event: Claude build day · Owner: Hrishikesh (product) · Lead: the Bundle Claude project · Executor: Claude Code + team
Precedence: ZW-FS-001 v1.0 (the product spec, in the repo as `public/Bundle_ZW-FS-001_v1_0.pdf`) > this handover. Nothing here weakens a §5 invariant.
Scope note: security and privacy are out of scope for this build by owner decision — the API key lives in `.env` for local dev; the deployed site proxies through a Netlify function.

> **Build-day status (2026-09-20 16:30 IST):** deliverable 1 (a real chat with a Claude-written card) is live. Deliverables 2–6 are specified below and not yet built. See the README's "What is real and what is simulated" table.

---

# Part A — Product handover

## A1. What Bundle is, in one paragraph

Bundle is a toggle on Claude's chat index. Off, nothing changes. On, scattered chats about the same ongoing concern gather into named, collapsible sections above the chronological list. A bundle is a view, not a move: every chat stays where it was, the list stays beneath, and the person can rename, remove a chat, hide a bundle, or switch it off and get the previous screen back unchanged. Four invariants hold it together: the list is never replaced (INV-1), a bundle never moves a chat (INV-2), every generated name is correctable and safety-filtered (INV-3), and Bundle sees only what memory already sees (INV-4).

## A2. What v0.2 proves

v0.1 (live at zugzwang-claude-bundle.in/prototype) shows the *experience* over 36 fixture chats whose groups are hard-coded. v0.2 replaces the hard-coding with a real system and opens the hood so a technical audience can watch it work.

**Thesis for the room:** *A toggle on the surface. Underneath, five techniques — and Claude is used only where judgement is needed.*

## A3. The demo — four beats

| Beat | The person does | The room sees |
|---|---|---|
| 1 | Clicks **New chat**, types a message, gets a real reply | Claude writes the chat's title and two-line summary — its *card* — live |
| 2 | Flips **Bundle chats** | The list never blinks; skeletons appear above it; three bundles form with the ✦ mark; the new chat sits inside the right one |
| 3 | With Bundle on, starts a second chat that could belong to two bundles | It joins one; nothing is renamed; nothing else moves; the runner-up and the reason are shown |
| 4 | At any point | The **stage view**: the architecture running on the right, the new chat travelling through each stage, one plain sentence per stage, real output on every card |

## A4. The six deliverables

1. **A real chat inside the demo** — composer, reply, and the card (title + summary) written by Claude.
2. **A grouping brain** — embeddings computed in the browser, a similarity map, agglomerative clustering, and the spec's three formation rules as code.
3. **Claude only where judgement is needed** — naming a concern, gating a name, breaking a tie.
4. **A safety gate on every name** — a lexicon in code, then Claude's judgement; a health cluster renders as `Health`, never a condition. The demo life includes one such cluster.
5. **The toggle, exactly per spec** — six states, verbatim copy, rename/remove/hide/undo, off→on resumes, J-2 attach.
6. **The hood, open** — the stage view with story mode (auto-play, ~20 s) and inspect mode (click a stage for raw detail).

Optional: a **Compare** tab running the naive "ask the model to group everything" version twice, showing how names and members churn between runs.

## A5. Demo life and demo lines

- **Life:** Meera — the 36 fixture chats, each given a generated summary, plus four added health-scare chats (concern `health`) so the gate has something to downgrade.
- **Beat 1 message:** "My bank says the SCSS interest is credited quarterly — should I move part of it to a 5-year tax-saver FD instead?" → card ≈ *SCSS vs tax-saver FD* → lands in **Retirement planning**.
- **Beat 3 message (ambiguous by design):** "How do I say 'the landlord raised the rent' in Spanish?" → **Spanish practice** or **Apartment hunt**; Claude picks, the runner-up is shown.
- **Reset the prototype** returns the life to its starting state; corrections are cleared with it.

## A6. Definition of done — checkable by looking

| # | Outcome |
|---|---|
| D1 | A new chat gets a real reply, then a title and summary; the stage view shows the Card stage with both |
| D2 | Toggle on: the list never blinks; skeletons; bundles form; the new chat is in the correct bundle |
| D3 | Every chat appears exactly once across bundles and All chats (INV-1, INV-2) |
| D4 | No bundle named Other / Miscellaneous / General; rejected clusters are listed with the rule they failed |
| D5 | The health cluster renders as `Health`; the Safety-gate stage shows the generated name struck through and the reason |
| D6 | Second chat while on: attaches with a reason; no bundle renamed; no other chat moves; the ambiguous case shows the runner-up |
| D7 | Rename / remove / hide work with Undo, survive reload, and survive toggle off→on |
| D8 | Story mode plays end to end in ≤ 25 s; inspect mode shows the raw request and response for every Claude call and the numbers for every code stage |
| D9 | An API failure produces the §9 failure state; the list is untouched; Try again works |
| D10 | Embeddings are computed in the browser; the only network calls are to api.anthropic.com |
| D11 | Two runs on the same life produce identical groups; names are frozen after the first run and do not change on the second |
| D12 | `npm run build` passes; `npx vitest run` is green (ported state invariants + safety corpus + rules tests) |

## A7. Not in v0.2

Loading real exports · accounts · any server · mobile · browser extension · promote-to-Project · "where you left off" briefs · token/cost meters as a centrepiece (they live in inspect mode only).

---

# Part B — Technical handover

## B1. Where the repo is today (v0.1)

- React 19 + Vite 8 SPA, JavaScript/JSX, npm, Node ≥ 22. Routes: `/` explainer, `/prototype`.
- `src/data/` holds `MEERA_CHATS` (36 rows: `id, title, date, concern, project`) — `concern` is hard-coded; no engine exists.
- The prototype's reducer + `selectIndex` derivation enforces INV-1/INV-2 and is tested by hand-rolled scripts in `scripts/` (`statetest.js`, smoke). Those assertions are the seed of the Vitest suite.
- No CI, no `.env` rule, no tests runner. Netlify serves `origin/main`.

## B2. Architecture

```
                    ┌────────── FORM (toggle on) ──────────┐
 cards ──► embed ──► map + cluster ──► rules ──► name ──► gate ──► merge ──► render
   │                      │                                              ▲
   │                      └── ATTACH (new chat while on) ──► tie-break? ─┘
   │
   └── Card: Claude writes title + summary for a NEW chat (fixtures ship with theirs)
```

**Claude is called in exactly four places:** Reply (the chat itself), Card, Name, Gate — plus Tie-break when two bundles are within a margin. Everything else is code.

| Stage | Technique | Runs where | Output |
|---|---|---|---|
| Card | Claude, forced JSON | api.anthropic.com | `{ title ≤ 6 words, summary ≤ 40 words }` |
| Embed | Sentence-embedding model via transformers.js | Browser (WASM/WebGPU) | one 384-dim vector per chat, from `"${title}. ${summary}"` |
| Map + cluster | Cosine similarity; agglomerative clustering, average linkage, stop at threshold `τ_form` | Browser | clusters of chat ids; similarity edges ≥ `τ_edge` for the map |
| Rules | The formation standard as code: `size ≥ 4` · `distinct days ≥ 2` · nameable (decided by Name refusing or not) | Browser | candidates vs rejected (`too_few` · `not_ongoing` · `no_specific_name`) |
| Name | Claude, forced JSON | api.anthropic.com | `{ name, domain, language, sensitive, concern }` or refusal |
| Gate | Lexicon + heuristics in code, then Claude, forced JSON | Browser then API | `pass` · `downgrade → domain` · `refuse` with reason |
| Merge | Stability rules (B6) applied over the reducer state | Browser | the projection the UI renders |
| Attach | Nearest bundle centroid ≥ `τ_attach`; if top-two within `δ`, Tie-break | Browser (+ API on tie) | `{ bundle_id | null, runner_up, reason }` |

Defaults (all in `src/engine/config.js`, all shown in inspect mode): `τ_form 0.55` · `τ_attach 0.50` · `τ_edge 0.45` · `δ 0.05` · `min_size 4` · `min_days 2`. Tune on the Meera life so the three known concerns form and the singles do not; record the final values in `docs/STATE.md`.

## B3. Stack

| Layer | Choice | Notes |
|---|---|---|
| App | React 19 + Vite 8 + react-router 7, JavaScript (as is) | No framework change today |
| Embeddings | `@huggingface/transformers` (transformers.js); suggested model `Xenova/all-MiniLM-L6-v2` (English, ~23 MB quantised); multilingual option `Xenova/multilingual-e5-small` | **Verify model ids at install.** For the booth, vendor the model files under `public/models/` and point the library at the local path so no download happens on stage |
| Map | `d3-force` for the concern map (nodes = chats, links = similarity ≥ `τ_edge`) | Motion via `framer-motion` (already in the repo) |
| Claude | `fetch` to `POST https://api.anthropic.com/v1/messages` (direct in dev, via `/api/messages` when deployed). **Build-day finding:** `claude-fable-5-1` rejects `tool_choice: {type:"tool"}`; use `tool_choice: auto`, require the tool in the system prompt, and parse JSON from text as a fallback. The model thinks before answering, so output budgets must be ≥ 1500 tokens | Model from `VITE_MODEL`, default `claude-fable-5-1` |
| Tests | Vitest 4 | Port `scripts/statetest.js` first; keep every assertion |
| Persistence | `localStorage`, keyed by life id | Corrections only. The API key is never persisted |

## B4. Module map

```
src/
  data/meera.json              36 fixtures + 4 health chats, each with summary   (generated once by scripts/gen-summaries.mjs)
  engine/
    config.js                  τ values, min_size, min_days, δ, model ids
    anthropic.js               fetch wrapper, headers, forced-JSON tools, error mapping, usage capture   ✓ built
    prompts.js                 exact rule text for Card, Name, Gate, Tie-break (B7)
    card.js  name.js  gate.js  tiebreak.js  reply.js                                                  ✓ card, reply built
    embed.js                   load model once; embed(text) → Float32Array; cache by chat id
    similarity.js              cosine, pairwise matrix, kNN for the map
    cluster.js                 agglomerative average-linkage to τ_form; centroids
    rules.js                   formation standard → candidates / rejected with reasons
    attach.js                  nearest centroid, margin check, tie-break call
    merge.js                   stability rules over reducer state (B6)
  safety/
    lexicon.js                 conditions, medications, symptoms; person-name heuristic + allowlist
    gate.js                    layer 1 (code) → layer 2 (Claude) → decision
  app/
    routes/demo.jsx            three-pane layout; split into stage view
    state/                     reducer (from prototype) + new actions + persistence                     ✓ CHAT_CREATED built
  stage/
    Stage.jsx                  the pipeline of stage cards; story + inspect modes
    cards/*.jsx                Card, Understanding, ConcernMap, Rules, Naming, SafetyGate, Render
    story.js                   authored captions and timings (B8)
    trace.js                   stage events store
tests/
  state.test.js  rules.test.js  safety.test.js  cluster.test.js
```

## B5. Data shapes

```js
// Chat card — the only thing the engine sees
{ id, title, summary, createdAt, updatedAt, source: "fixture" | "new" }

// Vector cache
{ chatId, vector: Float32Array(384), modelId }

// Cluster (pre-name)
{ key, chatIds: [], centroid: Float32Array, cohesion, days: number }

// Bundle (post-gate)
{ id, name, nameSource: "model" | "person", domain, language, sensitive, concern, chatIds: [], hidden: false }

// Corrections (persisted)
{ renames: { [bundleId]: name }, removed: { [chatId]: true }, hidden: { [bundleId]: true } }

// Stage event (what the stage view renders)
{ stage: "card"|"embed"|"map"|"rules"|"name"|"gate"|"merge"|"render"|"attach"|"tiebreak",
  status: "pending"|"running"|"done"|"error", ms, input, output, raw: { request, response } | null }
```

## B6. Stability merge — the rules, in order

1. A bundle whose id has a person-set name keeps that name; the model's name is discarded.
2. A chat in `removed` is dropped from any bundle the model puts it in; it is never re-added.
3. A bundle in `hidden` never renders, even if the model re-forms it; its chats stay in the list.
4. Attach never renames and never moves any chat except the new one.
5. Names are frozen after their first render; a re-run keeps existing names by matching bundles on member overlap (≥ 50 %). New bundles get new names.
6. Toggle off flips the flag only. Toggle on re-runs Form and merges again; the Merge stage shows what the rules overrode.

## B7. Claude calls — tools and rules

| Call | Tool name | Schema | Rules in the system prompt |
|---|---|---|---|
| Card | `emit_card` | `{ title: string, summary: string }` | Title as Claude titles chats — short, noun-led, ≤ 6 words. Summary: one or two plain sentences on what was asked and what was learned, ≤ 40 words |
| Name | `emit_name` | `{ name, domain, language, sensitive: boolean, concern }` or `{ refuse: true, reason }` | Name a specific ongoing concern in 2–4 words, in the members' dominant language. Name the domain, never the struggle: a health cluster is at most `Health`; money trouble `Finances`; legal `Legal`. Never a condition, symptom, diagnosis, medication, another person's name, or intimate detail. If the honest name is Miscellaneous, General or Other — refuse. `concern` is one plain sentence saying what the person keeps returning to |
| Gate | `emit_gate` | `{ decision: "pass"|"downgrade"|"refuse", replacement?: string, reason }` | Pass if the name names a domain or activity. Downgrade to the domain word if it names a struggle. Refuse if no safe name exists. One-sentence reason |
| Tie-break | `emit_tiebreak` | `{ bundle_id: string|null, runner_up: string, reason }` | Join the bundle whose concern the new chat clearly continues; otherwise null. Never propose a name |

Layer 1 of the gate runs in code before Claude is asked: lexicon hits (conditions, medications, symptoms) → downgrade to `domain`; a two-capitalised-word person-name pattern not in the place/brand allowlist → downgrade. Every decision — layer, input, output, reason — is a stage event.

## B8. The stage view

**Layout.** When the toggle flips (or a new chat is created while on), the frame splits: Claude UI left (~40 %), stage right. A keyboard shortcut collapses the stage. Seven stage cards in a row (Form) or five (Attach). Each card: technique name in monospace, one authored caption, live output, a status glyph. The new chat is a chip that moves card to card.

**Story mode** (default at the booth): auto-plays with the captions below; ~20 s total; the sidebar updates on the left in sync with the Render card.
**Inspect mode:** click a card → a drawer beneath it with raw request/response (Claude stages) or the numbers (code stages: vector preview, top-3 neighbours with scores, cluster sizes, rule results, config values).

**Authored captions — use verbatim:**

| Stage | Caption |
|---|---|
| Card | Claude reads the chat once and writes its card: a title and a two-line summary. Nothing downstream ever sees more than this. |
| Understanding | The card becomes a point in a space of meaning. Chats about the same thing land close together. Computed on this laptop. |
| Concern map | Every chat is a dot; near dots are joined. Groups you can see are groups the code can find. |
| Formation rules | A group is real only if it passes three tests from the spec: at least four chats, spread over at least two days, and nameable. |
| Naming | Claude reads the members and writes a specific name — or refuses. "Miscellaneous" is not a name. |
| Safety gate | Before a name reaches your sidebar it passes two checks. A health scare becomes Health. Never a condition, never a person. |
| Stability → render | Your corrections outrank the model, a new chat never renames anything, and the list beneath never moves. |
| Attach (map variant) | The new dot lands next to its nearest neighbours. |
| Tie-break | Two groups are close. Claude picks one and says why. |

**Concern map card:** `d3-force` layout; nodes coloured by bundle after formation; the new chat's node animates in from the card; hover a node for its title; the top-3 neighbours with scores listed beneath.

## B9. Configuration

```
VITE_ANTHROPIC_API_KEY=       # local dev only; .env is gitignored, never committed
VITE_MODEL=claude-fable-5-1
VITE_EMBED_MODEL=Xenova/all-MiniLM-L6-v2
ANTHROPIC_API_KEY=            # Netlify environment, read by netlify/functions/messages.mjs
```

Vite inlines `VITE_*` into the client bundle. Never deploy a build made with a local `.env` present; the deployed site uses the proxy.

## B10. Team lanes and the integration contract

| Lane | Owns | Done when |
|---|---|---|
| Fixtures | `scripts/gen-summaries.mjs`, `src/data/meera.json` (+ health cluster), vendored embedding model | Life loads; every chat has a summary; the model loads offline |
| Engine | embed, similarity, cluster, rules, attach, config; `rules.test.js`, `cluster.test.js` | Form on the Meera life yields the three known concerns, twice, identically |
| Claude + safety | anthropic wrapper, prompts, card/name/gate/tiebreak, lexicon, `safety.test.js` (≥ 30 must-never-render, ≥ 20 must-pass) | Health cluster downgrades; beat-3 tie-break returns a reason |
| State | reducer actions (`chat/created`, `chat/carded`, `bundles/formed`, `bundle/attached`), merge, persistence; port `statetest.js` → `state.test.js` | D3, D7, D11 green |
| UI + stage | `/demo` route, six states with verbatim §9 copy, stage cards, story/inspect modes, concern map | Four beats clickable end to end; story ≤ 25 s |

**Integration contract, agreed in hour one:** the reducer's state shape and the stage-event shape (B5). Engine and UI never touch each other's directories.

## B11. Build order

1. Branch `v0.2-demo`. ✓
2. `.env*` to `.gitignore`; `.env.example`; prove the key works from the browser. ✓
3. Fixtures: generate summaries once; add the health cluster; vendor the embedding model; confirm it loads with the network off.
4. Engine: embed → similarity → cluster → rules → attach. Tune `τ` on the life. Tests.
5. Claude + safety: card ✓, name, gate, tie-break; lexicon; corpus tests.
6. State: actions (`CHAT_CREATED` ✓), merge, persistence; port the invariant tests.
7. UI + stage: route, six states, stage cards, story captions, concern map. (Live composer in the demo rail ✓)
8. Verify D1–D12; `npm run build`; `npx vitest run`.

## B12. Known risks

| Risk | Mitigation |
|---|---|
| Embedding model download on booth wifi | Vendor the model under `public/models/`; verify offline load before the day |
| `τ` mis-tuned on real text | Tune on the Meera life; expose in inspect mode; record final values in `docs/STATE.md` |
| Claude names drift between runs | Names frozen after first render (B6 rule 5); Compare tab exists to show the naive alternative churning |
| Devanagari rendering in the stage | Test one Marathi-named bundle early in the UI lane |
| API errors mid-story | §9 failure state; story mode pauses on the failed card with Try again |
| Key inlined by Vite | Read only named `import.meta.env.VITE_*` properties, never the object; build for deploy with `.env` absent; deployed site uses the proxy |
