# v0.2 build state

Living record of what each lane has actually landed. Lanes append their own section; do not
rewrite another lane's.

## Fixtures (`src/data/**`, `scripts/gen-summaries.mjs`, `public/models/**`)

### Demo life

`src/data/chats.js` is still the source of truth for ids / titles / dates / concern hints.
`MEERA_CHATS` is now 40 chats: the original 36 (unchanged ids, titles, dates) plus four
health-scare chats, concern `'health'`, dates spread across the same March–June 2026 window:

| id | title | date |
|---|---|---|
| h1 | Is this chest tightness after walking serious | 2026-03-18 |
| h2 | What does a borderline HbA1c result mean | 2026-04-09 |
| h3 | Amlodipine making my ankles swell — should I stop | 2026-05-06 |
| h4 | Cardiologist referral — what happens at the first visit | 2026-06-11 |

`CONCERNS` gained `health: { key: 'health', defaultName: 'Health' }`. Every chat object now
carries `summary` and `source: 'fixture'` (Chat shape in `docs/CONTRACT.md`). `concern` remains a
fixture hint for the simulated path only; the engine never reads it.

Exports unchanged: `CONCERNS`, `MEERA_CHATS`, `FRESH_CHATS`, `INCOMING_CHATS`, `dateLabel`,
`sortKey`, `byNewest`.

### Summaries — `src/data/meera.json`

Shape: `{ meera: Chat[40], incoming: Chat[3], fresh: Chat[4] }`, each
`{ id, title, summary, date, concern, project, source: 'fixture' }`. All 47 chats have a summary
(≤ 40 words, plain text, "what she asked and what she learned").

`chats.js` imports the json (`import meera from './meera.json' with { type: 'json' }`) and
attaches `summary` by id; a chat missing from the json gets `''` rather than throwing. The import
attribute is handled by esbuild (`npm test`, `npm run smoke`), Vite (`npm run build`, vitest) and
Node 25 (the generator imports `chats.js` directly).

Regenerate (idempotent — only chats with an empty `summary` are sent to the API):

```
npm run gen:summaries          # = node --env-file=.env scripts/gen-summaries.mjs
```

To redo one chat, blank its `summary` in `meera.json` and re-run. The script reads
`process.env.VITE_ANTHROPIC_API_KEY`, POSTs to `https://api.anthropic.com/v1/messages` with
`anthropic-version: 2023-06-01`, model `claude-fable-5-1` (override with `VITE_MODEL`),
`max_tokens: 1500` (the model thinks first; smaller budgets return empty text), no tools, no
`tool_choice`, concurrency 6, retries on 429/5xx/network, one word-count retry when an answer
runs over 40 words. It writes the json after every completed chat, so an interrupted run keeps
its progress.

### Embedding model — `public/models/Xenova/all-MiniLM-L6-v2/`

Vendored from `https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/<path>` (curl):

| file | bytes |
|---|---|
| `config.json` | 650 |
| `tokenizer.json` | 711,661 |
| `tokenizer_config.json` | 366 |
| `special_tokens_map.json` | 125 |
| `onnx/model_quantized.onnx` | 22,972,370 |

Total ≈ 23 MB — the single int8 quantised graph plus tokenizer files, nothing else.
`public/models` is not gitignored (the repo `.gitignore` only excludes logs, `node_modules`,
`dist`, editor files, `.netlify` and `.env*`).

Verified offline load with `@huggingface/transformers` 4.3.0 in Node 25 — these exact options
work, no network:

```js
import { pipeline, env } from '@huggingface/transformers';
env.allowRemoteModels = false;
env.localModelPath = 'public/models/';          // in the browser: '/models/'
const p = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' });
const out = await p('hello world', { pooling: 'mean', normalize: true });
// out.dims → [1, 384]
```

`dtype: 'q8'` maps to `onnx/model_quantized.onnx` in transformers.js v4, so no renaming was
needed. The output is a 384-dimensional unit vector. (`dtype: 'fp32'` would look for
`onnx/model.onnx`, which is deliberately not vendored.)

### Heads-up for the State lane — `scripts/statetest.js`

Adding the four health chats (and the `health` concern to `CONCERNS`) changes five hard-coded
counts in `scripts/statetest.js`; every data-derived assertion (partition, ordering, INV-4)
still passes. The Fixtures lane did not edit `scripts/` — these need updating by the test owner:

| line | assertion | was | now |
|---|---|---|---|
| 10 | `A1 off: flat list of 34` | 34 | 38 |
| 17 | `INV-1: list untouched during generation` | 34 | 38 |
| 56 | `off restores flat list (34 + 1 arrival)` | 35 | 39 |
| 78 | `A12 index untouched on failure` | 35 | 39 |
| 104 | `A5 precondition: bundles formed (9+5+12)` | 26 | 30 (9+5+12+4) |

`npm run smoke` and `npm run build` pass as-is.

## Engine

Owner: engine lane. Files: `src/engine/{config,embed,similarity,cluster,rules,attach,form}.js`, `tests/{similarity,cluster,rules,engine}.test.js`. Run: `npx vitest run tests/similarity.test.js tests/cluster.test.js tests/rules.test.js` (pure, no network) and `npx vitest run tests/engine.test.js` (embeds the real fixtures with the vendored model; skips itself if `src/data/meera.json` is missing).

### Final CONFIG (tuned 2026-09-20 on `src/data/meera.json`, model `Xenova/all-MiniLM-L6-v2` q8, project chats excluded)

| key | value | why |
|---|---|---|
| `tauForm` | **0.305** | middle of the only clean window, [0.296, 0.316): at 0.295 `h1,h3,h4,u8` becomes an (impure) candidate; at 0.316 retirement splits into `r1,r3,r4,r6` + `r2,r5,r8,r9` |
| `tauAttach` | **0.40** | incoming `n1` → retirement 0.567, `n2` → spanish 0.602 attach; `r7` (a true member left out) 0.418 attaches; `u5` 0.362, `u1` 0.298, `n3` 0.276 stay unattached. `f4` "What is a mutual fund" would attach to retirement at 0.516 |
| `tauEdge` | **0.35** | 36 map edges, 4 of them cross-group (0.45 gives only 13 edges; 0.30 gives 66 with 17 cross) |
| `delta` | 0.05 | unchanged; every observed top-two gap ≥ 0.16 |
| `minSize` / `minDays` | 4 / 2 | unchanged (formation standard) |

`describe()` in `config.js` returns these as `[{ key, label, value }]` for inspect mode. `formClusters` now **excludes chats with a `project`** from formation (INV-4, `store.jsx` §7.2) and returns them as `excluded`; this also removed MiniLM's single worst bridge (`r1`+`p2` at 0.499, "questions to ask an adviser" vs "discussion questions ch. 4").

### What forms on the Meera life (deterministic, two runs identical, with or without the vector cache)

Candidates:
- retirement, 8 of 9: `r1 r2 r3 r4 r5 r6 r8 r9` (cohesion 0.381, 8 days). `r7` "Is this bank letter about my pension genuine" pairs with `s10` "Common false friends" (0.334) before it reaches retirement.
- spanish, 5 of 12: `s1 s2 s3 s4 s6` (cohesion 0.415, 5 days) — the grammar chats.

Rejected (all `too_few`): `r7,s10` · `a2,a4,a5` (0.477) · `s5,s11,u1` · `s7,s9` · `h1,h4` (0.458) · `h3,u8` · singletons `a1 a3 s8 s12 h2 u2 u3 u4 u5 u6 u7`. No candidate is impure, no single or project chat is in a candidate. Apartment and health do **not** form.

### There is no clean threshold — the evidence

Average-linkage merge order with MiniLM (project chats excluded), ✗ = cross-group:

```
0.821 r2+r5 · 0.539 +r8 · 0.514 s1+s2 · 0.490 a4+a5 · 0.490 r3+r6 · 0.470 a2+(a4,a5) · 0.467 s4+s6
0.458 h1+h4 · 0.447 r1+r4 · 0.422 s3+(s4,s6) · 0.420 (r1,r4)+(r3,r6) · 0.388 (s1,s2)+(s3,s4,s6)
0.373 (r2,r5,r8)+r9 · 0.371 ✗ h3+u8 · 0.348 ✗ s11+u1 · 0.334 ✗ r7+s10 · 0.324 ✗ s5+(s11,u1)
0.315 s7+s9 · 0.314 retirement halves merge · 0.295 ✗ (h1,h4)+(h3,u8) · 0.286 spanish 5+2
0.256 ✗ a1+u7 · 0.245 ✗ h2+u5 · 0.206 ✗ (a1,u7)+(a2,a4,a5) · 0.203 s8+s12 · … a3 never joins apartment
```

Group-average similarities (MiniLM, title+summary): within retirement 0.36, apartment 0.26, spanish 0.24, health 0.32; between groups 0.04–0.15. Weakest in-group pairs: `a3`–`a5` 0.04, `s8`–`s11` −0.02, `h2`–`h3` 0.24.

Bridges that exist in every model tested (they are in the text, not the model):
- `s5` "Practice dialogue: at the pharmacy" ↔ `h4` "Cardiologist referral" (0.44 MiniLM, 0.63 bge, 0.86 gte): the summary is about prescriptions and dosage and never says Spanish.
- `s8` "Numbers above one thousand" ↔ apartment/retirement: the summary is about lakh vs crore vs million, never Spanish.
- `s11` "Greetings for a video call" ↔ `u1` "birthday message for Ravi": summary never says Spanish. `s12` likewise.
- `h1` "chest tightness after walking" / `h3` "amlodipine" ↔ `u8` "Knee exercises after morning walks"; `h2` "HbA1c" sits far from the other three.
- Every summary starts "She asked … Claude explained/suggested …" — a shared component that lifts all cross-group cosines. Subtracting the corpus mean before cosine did not open a window.

Alternatives measured (Node, hub download; none give all four groups; best tau, pure candidates only):

| model (q8) | size | best result on contract text |
|---|---|---|
| `Xenova/all-MiniLM-L6-v2` (vendored) | 23 MB | tau 0.305 → retirement 8/9, spanish 5/12 |
| `Xenova/gte-small` | 33 MB | tau 0.82 → retirement 9/9, apartment 4/5 (no `a3`), spanish 8/12; health no |
| `Xenova/bge-small-en-v1.5` | 33 MB | tau 0.54 → retirement 9/9, spanish 8/12 |
| `Xenova/all-mpnet-base-v2` | 110 MB | tau 0.29 → retirement 9/9, **health 4/4**, apartment 4/5, spanish 6/12 |
| `Xenova/multilingual-e5-small` | 118 MB | tau 0.885 → two partial groups; `u5` merges into retirement early |

Also tried (no clean window): title-only text, boilerplate-stripped summaries, mean-centred cosine, averaging separate title and summary vectors (MiniLM: retirement 9/9 + spanish 4/12 at tau 0.30). With the four Spanish summaries patched to mention Spanish and the health ones prefixed "heart health", gte-small comes within one chat (`a3`) of a clean window (first bad merge 0.807, apartment completes 0.799).

### What would make all four form (for the integrator / Fixtures lane)

1. Regenerate summaries for `s5 s8 s11 s12` so they say the chat was Spanish practice, and for `h1–h4` with the shared thread (heart, blood pressure, doctor) explicit — the generator prompt does not pass the concern, so those summaries drifted off-topic. Then re-run `npx vitest run tests/engine.test.js`: its `it.fails` case flips when all four form (promote it to `it` and update `TUNED`), and `agglomerative(..., { onMerge })` prints the merge order for re-tuning.
2. Optionally vendor `Xenova/gte-small` (same loader, same 384 dims, 33 MB) or `all-mpnet-base-v2` (110 MB, 768 dims) and change `CONFIG.embedModel` + `tauForm` (0.82 / 0.29); the stage's "384-dim" copy would need to change for mpnet.
3. `tests/engine.test.js` hard-codes the tuned outcome (`TUNED`) and will fail loudly if the fixtures or model change; that is intended — re-tune with the sweep and update the table above.

### Notes for the integrator

- `embed.js`: browser → `env.allowRemoteModels=false`, `env.localModelPath='/models/'`, falls back to remote with a `console.warn` if the local load throws. Node → uses `public/models` when present (no network), else the hub. Model promise memoised; vectors cached by chat id (`clearCache()` to drop). Text is `` `${title}. ${summary}` `` (`cardText`).
- `formClusters(cards, config, { onEvent, runId, onProgress })` emits `embed`/`map`/`rules` running→done with the contract event shape (`id`, `runId`, `stage`, `status`, `ms`, `input`, `output`, `raw: null`). `embed.output = { count, dims, ms, sample }`, `map.output = { edges, neighbours: { [id]: top-3 } }`, `rules.output = { candidates, rejected }` (summaries with `key`, `chatIds`, `cohesion`, `days`, `reason`). Returns `{ vectors, ids, matrix, clusters, candidates, rejected, edges, excluded }`.
- `agglomerative(ids, matrix, tau, vectors, { onMerge })` — the optional merge hook gives the trace above for inspect mode.
- Cluster `key` = `'c' + djb2(sorted ids joined by '+')` base36; stable across runs and independent of input order.
- Embedding 38 chats takes ~0.4 s in Node after a ~0.2 s model load from `public/models`.
- **Offline booth gap (Fixtures lane):** in the browser transformers.js 4.3 fetches the ONNX runtime from `https://cdn.jsdelivr.net/npm/onnxruntime-web@<ver>/dist/ort-wasm-simd-threaded.asyncify.{mjs,wasm}` unless `env.backends.onnx.wasm.wasmPaths` is set, so the vendored model alone does not load with the network off. `embed.js` probes `CONFIG.ortWasmPath` (`/models/ort/`) with a HEAD request and uses it when present, else falls back to the CDN with a `console.warn`. To close the gap copy `node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs` and `.wasm` into `public/models/ort/` (the version must match the installed `onnxruntime-web`, currently `1.31.0-dev.20260914-8d85527a0`), then verify with the network off.

### Engine — retune after fixture regeneration (2026-09-20, integrator)

The first tuning pass found no clean window because the generated summaries for s5, s8, s10, s11, s12 never said "Spanish" and h1–h4 never named the shared heart/blood-pressure thread. Those twelve summaries (plus a1, a3, r7) were regenerated with the concern stated, as a real chat would carry it. With `Xenova/all-MiniLM-L6-v2` (q8) the sweep then gives:

| τ_form | Candidates | Rejected multi-chat |
|---|---|---|
| 0.24 | retirement 9 · apartment 5 · spanish+single 13 · health 4 | — |
| **0.26** | **retirement 9/9 · apartment 5/5 · spanish 11/12 · health 4/4** | s9+u1 (too_few) |
| 0.28 | retirement 8 · apartment 5 · spanish 11 · health 4 | s9+u1 |
| 0.29 | retirement 8 · spanish 10 · health 4 | apartment splits 2+3 |

Final: `tauForm 0.26 · tauAttach 0.40 · tauEdge 0.22 · delta 0.05 · minSize 4 · minDays 2`.
Attach scores against the concern centroids: n1 → retirement 0.574, n2 → spanish 0.655, n3 → retirement 0.300 (stays out), beat-1 SCSS message → retirement 0.534, beat-3 Spanish rent message → spanish 0.580 (apartment 0.171, so no tie-break fires; the runner-up is still shown). Singles peak at u5 0.356 and u1 0.355, under τ_attach.

Offline runtime: `public/models/ort/ort-wasm-simd-threaded.asyncify.{mjs,wasm}` vendored from the installed `onnxruntime-web` so the browser loads the embedder with the network off. `public/models` totals ~49 MB.
