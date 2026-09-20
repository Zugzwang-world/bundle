// Sentence embeddings via transformers.js. One model load (memoised promise), one vector
// per chat (cached by chat id). Text seen by the model: `${title}. ${summary}`.
import { CONFIG } from './config.js';

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

let embedderPromise = null;
let embedderMode = null; // 'local' | 'remote' once loaded
const cache = new Map(); // chat id → Float32Array

export function cardText(card) {
  const title = (card?.title || '').trim();
  const summary = (card?.summary || '').trim();
  return summary ? `${title}. ${summary}` : `${title}.`;
}

// transformers.js loads onnxruntime-web's WASM runtime from cdn.jsdelivr.net unless told
// otherwise. For the booth (no network) the two files can be vendored under CONFIG.ortWasmPath;
// probe for them and use them when present, else keep the CDN default and say so.
const ORT_WASM = 'ort-wasm-simd-threaded.asyncify.wasm';
async function configureWasm(env) {
  const prefix = CONFIG.ortWasmPath;
  if (!prefix || !env.backends?.onnx?.wasm) return;
  try {
    const res = await fetch(prefix + ORT_WASM, { method: 'HEAD' });
    const type = res.headers.get('content-type') || '';
    if (res.ok && !type.includes('text/html')) {
      env.backends.onnx.wasm.wasmPaths = prefix;
      return;
    }
  } catch {
    /* fall through */
  }
  console.warn(`[embed] ${prefix}${ORT_WASM} not found; onnxruntime-web will load its runtime from the CDN`);
}

async function configureEnv(env, local) {
  if (isBrowser) {
    // transformers.js disables local models in the browser by default; the vendored copy under
    // public/models is the whole point of the booth setup, so turn it on explicitly.
    env.allowLocalModels = true;
    env.allowRemoteModels = !local;
    env.localModelPath = CONFIG.localModelPath;
    await configureWasm(env);
    return;
  }
  // Node (tests / scripts): prefer the vendored copy under public/models when present,
  // otherwise the hub with the default cache dir.
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const dir = path.resolve(process.cwd(), 'public', 'models');
    const hasLocal = fs.existsSync(path.join(dir, CONFIG.embedModel, 'config.json'));
    env.allowRemoteModels = local === true ? false : true;
    env.localModelPath = hasLocal ? dir + path.sep : env.localModelPath;
  } catch {
    env.allowRemoteModels = true;
  }
}

async function build(local) {
  const { pipeline, env } = await import('@huggingface/transformers');
  await configureEnv(env, local);
  const make = () => pipeline('feature-extraction', CONFIG.embedModel, { dtype: 'q8' });
  try {
    const p = await make();
    embedderMode = env.allowRemoteModels ? 'local-or-remote' : 'local';
    return p;
  } catch (err) {
    if (env.allowRemoteModels) throw err;
    console.warn(`[embed] local model load failed (${err?.message || err}); falling back to remote`);
    env.allowRemoteModels = true;
    const p = await make();
    embedderMode = 'remote';
    return p;
  }
}

/** Load the model once. `local` defaults to true in the browser, false-ish (local-if-present) in Node. */
export function loadEmbedder({ local = isBrowser } = {}) {
  if (!embedderPromise) {
    embedderPromise = build(local).catch((err) => {
      embedderPromise = null; // let the next call retry
      throw err;
    });
  }
  return embedderPromise;
}

export function embedderInfo() {
  return { model: CONFIG.embedModel, mode: embedderMode, cached: cache.size };
}

/** Embed one string → unit-normalised Float32Array(384). */
export async function embedText(text) {
  const extractor = await loadEmbedder();
  const out = await extractor(String(text), { pooling: 'mean', normalize: true });
  const data = out.data instanceof Float32Array ? out.data : Float32Array.from(out.data);
  return data.length === out.dims?.at(-1) ? data : data.slice(0, out.dims?.at(-1) ?? data.length);
}

/**
 * Embed every card, cached by id. onProgress({ done, total, id }) after each card.
 * @returns {Promise<Map<string, Float32Array>>} in card order
 */
export async function embedCards(cards, { onProgress } = {}) {
  await loadEmbedder();
  const result = new Map();
  const total = cards.length;
  let done = 0;
  for (const card of cards) {
    let vec = cache.get(card.id);
    if (!vec) {
      vec = await embedText(cardText(card));
      cache.set(card.id, vec);
    }
    result.set(card.id, vec);
    done++;
    if (onProgress) onProgress({ done, total, id: card.id });
  }
  return result;
}

export function clearCache() {
  cache.clear();
}
