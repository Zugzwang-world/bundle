// Engine configuration — every number the pipeline uses, shown in inspect mode.
// Values were tuned on the Meera life (see docs/STATE.md, "Engine").
// Tuned 2026-09-20 on src/data/meera.json with Xenova/all-MiniLM-L6-v2 (q8), project chats
// excluded (INV-4), after the Spanish and health summaries were regenerated with their concern
// stated. Clean window for tauForm is [0.25, 0.28]: retirement 9/9, apartment 5/5, spanish 11/12
// (s9 pairs with u1), health 4/4, no impure candidate, singles out. Below 0.25 singles join;
// at 0.29 apartment splits. Attach: singles peak at 0.36 (u5), demo chats ≥ 0.53 — τ_attach 0.40.
export const CONFIG = {
  tauForm: 0.26, // agglomerative stop: merge while best average similarity ≥ tauForm
  tauAttach: 0.4, // a new chat attaches to the nearest centroid only at ≥ tauAttach
  tauEdge: 0.22, // concern-map edges drawn for similarity ≥ tauEdge
  delta: 0.05, // top-two centroids within delta → tie-break
  minSize: 4, // formation standard: size ≥ minSize
  minDays: 2, // formation standard: distinct days ≥ minDays
  embedModel: 'Xenova/all-MiniLM-L6-v2',
  localModelPath: '/models/',
  ortWasmPath: '/models/ort/', // onnxruntime-web runtime (.mjs + .wasm); CDN fallback if absent
};

const LABELS = {
  tauForm: 'τ_form',
  tauAttach: 'τ_attach',
  tauEdge: 'τ_edge',
  delta: 'δ',
  minSize: 'min_size',
  minDays: 'min_days',
  embedModel: 'model',
  localModelPath: 'model path',
  ortWasmPath: 'wasm path',
};

// For inspect mode: [{ key, label, value }] in declaration order.
export function describe(config = CONFIG) {
  return Object.keys(config).map((key) => ({ key, label: LABELS[key] || key, value: config[key] }));
}
