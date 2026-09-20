# v0.2 integration contract (read before touching code)

Spec precedence: `public/Bundle_ZW-FS-001_v1_0.pdf` > `docs/HANDOVER_v0.2.md` > this file. Read `CLAUDE.md` for the visual worlds and immutable copy.
Stack: React 19 + Vite 8, plain JS/JSX, Node 25. Deps already installed: `@huggingface/transformers`, `d3-force`, `vitest` (config in `vitest.config.js`, tests in `tests/*.test.js`, run with `npm run test:unit`). Do NOT run `npm install` or edit package.json (except the Fixtures lane may add a script). Do NOT touch `.env`. Never read `import.meta.env` as an object; only named `import.meta.env.VITE_*` reads, wrapped in try/catch (see `src/engine/anthropic.js`).
Existing checks that must stay green: `npm test` (scripts/statetest.js), `npm run smoke`, `npm run build`.

## Shapes

```js
// Chat (fixtures ship with summary; new chats get theirs from Claude)
{ id, title, summary, date: 'YYYY-MM-DD' | 'today', concern: string|null /* fixture hint only, never read by the engine */, project: string|null, source: 'fixture'|'new' }

// Cluster (engine output, pre-name)
{ key: string /* deterministic, e.g. 'c0' by sorted member ids */, chatIds: string[], centroid: Float32Array, cohesion: number, days: number }

// Bundle (what the reducer stores after Form)
{ id, name, nameSource: 'model'|'person', domain, language, sensitive: boolean, concern: string, chatIds: string[] }
// Bundle ids: when a cluster's members overlap ≥ 50% with a known fixture concern ('retirement'|'apartment'|'spanish'|'health'), id = that key; otherwise 'b_' + cluster.key. This keeps names/hidden/collapsed corrections (keyed by id) stable.

// Stage event (what the stage view renders) — emitted through src/stage/trace.js
{ id, runId, stage: 'card'|'embed'|'map'|'rules'|'name'|'gate'|'merge'|'render'|'attach'|'tiebreak',
  status: 'pending'|'running'|'done'|'error', ms, input, output, raw: { request, response } | null, error?: string }

// Claude call result (every function in src/engine/{reply,card,name,tiebreak}.js and src/safety/gate.js returns this)
{ output, usage, ms, raw: { request, response } }
```

## Exports each lane must provide (exact names)

Fixtures — owns `src/data/**`, `scripts/gen-summaries.mjs`, `public/models/**`
- `src/data/meera.json`: 40 chats (the 36 in `src/data/chats.js` + 4 health-scare chats `h1..h4`, concern `'health'`, four different dates in 2026), every one with `summary` (≤ 40 words, generated once via the Messages API with the key from `.env` — run the script with `node --env-file=.env scripts/gen-summaries.mjs`; the script reads `process.env.VITE_ANTHROPIC_API_KEY`; model `claude-fable-5-1`, `max_tokens: 1500`, no forced tool_choice).
- `src/data/chats.js`: `MEERA_CHATS` gains `summary` (read from meera.json) and the 4 health chats; keep ids/titles/dates of the 36 unchanged; keep `CONCERNS`, `FRESH_CHATS`, `INCOMING_CHATS`, `byNewest`, `dateLabel` exports. Add `health: { key:'health', defaultName:'Health' }` to CONCERNS. Give `INCOMING_CHATS` and `FRESH_CHATS` summaries too.
- Vendored model under `public/models/Xenova/all-MiniLM-L6-v2/` (config.json, tokenizer.json, tokenizer_config.json, onnx/model_quantized.onnx) so `env.localModelPath='/models/'`, `env.allowRemoteModels=false` works in the browser. Document how in `docs/STATE.md`.

Engine — owns `src/engine/{config,embed,similarity,cluster,rules,attach,form}.js`, `tests/{cluster,rules,similarity}.test.js`
- `config.js`: `export const CONFIG = { tauForm: 0.55, tauAttach: 0.50, tauEdge: 0.45, delta: 0.05, minSize: 4, minDays: 2, embedModel: 'Xenova/all-MiniLM-L6-v2', localModelPath: '/models/' }` (tune tauForm on the Meera life so exactly retirement, apartment, spanish, health form and the 8 singles + 2 project chats do not; record the final values in `docs/STATE.md`).
- `embed.js`: `loadEmbedder({ local?: boolean })`, `embedText(text) → Float32Array`, `embedCards(cards, { onProgress }) → Map<id, Float32Array>` from `` `${title}. ${summary}` ``, cached by id. In Node tests, load from the Hugging Face hub (network allowed there) or from `public/models` if present.
- `similarity.js`: `cosine(a, b)`, `pairwise(vectors: Float32Array[]) → number[][]`, `neighbours(matrix, i, k) → [{ index, score }]`.
- `cluster.js`: `agglomerative(ids, matrix, tau) → Cluster[]` (average linkage, deterministic: ties broken by lowest index, cluster keys from sorted member ids), `centroid(vectors) → Float32Array`.
- `rules.js`: `applyRules(clusters, chatsById, config) → { candidates: Cluster[], rejected: [{ cluster, reason: 'too_few'|'not_ongoing' }] }` (distinct days from `date`; 'today' counts as one day).
- `attach.js`: `nearest(vector, bundles: [{ id, centroid }], config) → { bundleId|null, runnerUp: id|null, scores: [{ id, score }], tie: boolean }`.
- `form.js`: `formClusters(cards, config, { onEvent }) → { vectors, ids, matrix, clusters, candidates, rejected, edges: [{ a, b, score }] }` (code-only, no Claude). `onEvent` receives stage events for `embed`, `map`, `rules`.
- Tests must not need the network except embed; provide a pure-vector fixture for cluster/rules tests. Determinism test: same input twice → identical clusters.

Claude + safety — owns `src/engine/{prompts,name,tiebreak}.js`, `src/safety/{lexicon,gate}.js`, `tests/safety.test.js`; may edit `src/engine/card.js` (keep its export `card(userMessage, replyText)` and the `concern`/`runner_up` fields, they are the fallback placement)
- `prompts.js`: the exact B7 rule text as exported strings + the tool schemas.
- `name.js`: `nameCluster(cards) → result` with `output = { name, domain, language, sensitive, concern } | { refuse: true, reason }`.
- `tiebreak.js`: `tieBreak(card, candidates: [{ id, name, concern, sample: string[] }]) → result` with `output = { bundle_id, runner_up, reason }`.
- `src/safety/lexicon.js`: `CONDITIONS`, `MEDICATIONS`, `SYMPTOMS` arrays; `PLACE_BRAND_ALLOWLIST`; `looksLikePersonName(name)`; `lexiconHit(name) → { hit: boolean, term, category }`.
- `src/safety/gate.js`: `gateLayer1(nameOutput) → { decision: 'pass'|'downgrade', replacement?, reason, term? }` (pure, sync); `gateName(nameOutput, cards) → { decision: 'pass'|'downgrade'|'refuse', name: finalName|null, layer: 1|2, reason, raw }` (layer 1, then Claude with `emit_gate` unless layer 1 already downgraded).
- `tests/safety.test.js`: ≥ 30 names that must never render as given (conditions, symptoms, medications, person names, intimate details) and ≥ 20 that must pass (domains/activities incl. 'Retirement planning', 'Apartment hunt', 'Spanish practice', 'Health', 'Finances', 'Legal', a Marathi one) — against `gateLayer1` only (no network in tests). Use `tool_choice: { type: 'auto' }` via `forcedJson` in `src/engine/anthropic.js` (already handles the model's limits).

State — owns `src/state/**`, `src/engine/merge.js`, `tests/state.test.js`
- Reducer: keep every existing action. Add `BUNDLES_FORMED { runId, bundles: Bundle[], rejected }` (sets `state.bundles`, phase → 'ready' or 'thin' if none; ignore if runId stale), `BUNDLE_ATTACHED { chatId, bundleId|null, runnerUp, reason }` (adds chatId to that bundle only; never renames, never moves any other chat), `CHAT_CARDED { chatId, title, summary }`. `GENERATION_DONE` stays for the simulated path (when no engine result). `state.bundles` is `null` until an engine run; `selectIndex` uses `state.bundles` when non-null, else the existing CONCERNS fallback (so v0.1 still works).
- `src/engine/merge.js`: `mergeBundles(prevState, formed: { clusters, names: [{ key, name, domain, language, sensitive, concern }] }) → { bundles, overrides: [{ rule, detail }] }` implementing B6 rules 1–5 (person names win; removed chats dropped; hidden stays hidden; names frozen by ≥ 50% member overlap; ids per the rule above).
- Persistence: `names`, `removed`, `hidden`, `collapsed` to localStorage keyed by scenario (`bundle:corrections:<scenario>`), restored on load; RESET clears both. Never persist anything else (no key, no chats).
- `tests/state.test.js`: port every assertion in `scripts/statetest.js` to Vitest and add: D3 (every chat exactly once with engine bundles), D6 (attach never renames / moves), D7 (corrections survive off→on and a fresh provider load), D11 (merge keeps names on a second identical run).

UI + stage — owns `src/stage/**`, `src/styles/stage.css`, `src/components/proto/{LiveChat,DemoRail,Sidebar,ChatsPage}.jsx`, `src/pages/Prototype.jsx`, `src/App.jsx`
- `src/stage/trace.js`: tiny store: `emit(event)`, `startRun(kind: 'form'|'attach') → runId`, `useTrace()` hook → `{ runs, current }`, `subscribe`.
- `src/stage/story.js`: captions verbatim from HANDOVER B8; timings summing to ~20 s.
- `src/stage/Stage.jsx` + `src/stage/cards/*.jsx`: seven cards for Form (Card, Understanding, Concern map, Formation rules, Naming, Safety gate, Stability → render), five for Attach (Card, Understanding, Attach map, Tie-break, Stability → render). Technique name in mono, caption, live output, status glyph. Story mode auto-plays (default), inspect mode opens a drawer with raw request/response for Claude stages and numbers for code stages (vector preview, top-3 neighbours, cluster sizes, rule results, CONFIG). Concern map with `d3-force`. Keyboard shortcut (`\``) collapses the stage. Frame splits ~40/60 when the stage is open.
- Integration surface: import `runForm(cards, { state, dispatch })` and `runAttach(card, { state, dispatch })` from `src/engine/pipeline.js`. That file is written by the integrator AFTER the other lanes land; until then create `src/stage/mock.js` that emits a realistic scripted event sequence so the stage can be built and demoed, and have `LiveChat.jsx` / the toggle call `pipeline.js` if it exists else the mock (dynamic import with try/catch).
- Document world vs product world per CLAUDE.md: the stage is document world (`zw-`/`dr-` tokens); the app frame stays product world.
