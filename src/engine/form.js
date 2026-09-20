// Form, code-only: embed → map (pairwise + edges) → cluster + rules. Naming, gating and
// merging happen in the integrator's pipeline around this. Emits stage events for
// 'embed', 'map' and 'rules' (shape in docs/CONTRACT.md).
import { CONFIG } from './config.js';
import { embedCards } from './embed.js';
import { pairwise, neighbours } from './similarity.js';
import { agglomerative } from './cluster.js';
import { applyRules } from './rules.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function emitter(onEvent, runId) {
  let seq = 0;
  return (stage, status, fields = {}) => {
    if (!onEvent) return;
    onEvent({ id: `${runId}-${stage}-${seq++}`, runId, stage, status, ms: 0, input: null, output: null, raw: null, ...fields });
  };
}

const summarise = (c) => ({ key: c.key, chatIds: c.chatIds, cohesion: round(c.cohesion), days: c.days });
const round = (x) => Math.round(x * 1000) / 1000;

/**
 * @param {Chat[]} allCards   chats with a `project` are excluded (INV-4) and returned as `excluded`
 * @param {typeof CONFIG} config
 * @param {{ onEvent?: (e) => void, runId?: string, onProgress?: (p) => void }} opts
 */
export async function formClusters(allCards, config = CONFIG, { onEvent, runId = 'form', onProgress } = {}) {
  const emit = emitter(onEvent, runId);
  // INV-4 (§7.2): chats inside Projects are never candidates — the person already grouped them.
  // They are left out of formation entirely so they cannot bridge two concerns either.
  const cards = allCards.filter((c) => !c.project);
  const excluded = allCards.filter((c) => c.project).map((c) => c.id);
  const ids = cards.map((c) => c.id);

  // ── embed ──
  const t0 = now();
  emit('embed', 'running', { input: { count: ids.length, excluded, model: config.embedModel } });
  let vectors;
  try {
    vectors = await embedCards(cards, { onProgress });
  } catch (err) {
    emit('embed', 'error', { ms: Math.round(now() - t0), error: err?.message || String(err) });
    throw err;
  }
  const list = ids.map((id) => vectors.get(id));
  const dims = list[0]?.length ?? 0;
  const first = list[0] ? Array.from(list[0].slice(0, 8)).map(round) : [];
  const embedMs = Math.round(now() - t0);
  emit('embed', 'done', { ms: embedMs, input: { count: ids.length, excluded, model: config.embedModel }, output: { count: ids.length, dims, ms: embedMs, sample: first } });

  // ── map ──
  const t1 = now();
  emit('map', 'running', { input: { count: ids.length, tauEdge: config.tauEdge } });
  const matrix = pairwise(list);
  const edges = [];
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++)
      if (matrix[i][j] >= config.tauEdge) edges.push({ a: ids[i], b: ids[j], score: round(matrix[i][j]) });
  const near = {};
  for (let i = 0; i < ids.length; i++)
    near[ids[i]] = neighbours(matrix, i, 3).map(({ index, score }) => ({ id: ids[index], score: round(score) }));
  emit('map', 'done', { ms: Math.round(now() - t1), input: { count: ids.length, tauEdge: config.tauEdge }, output: { edges, neighbours: near } });

  // ── cluster + rules ──
  const t2 = now();
  emit('rules', 'running', { input: { tauForm: config.tauForm, minSize: config.minSize, minDays: config.minDays } });
  const clusters = agglomerative(ids, matrix, config.tauForm, vectors);
  const chatsById = new Map(cards.map((c) => [c.id, c]));
  const { candidates, rejected } = applyRules(clusters, chatsById, config);
  emit('rules', 'done', {
    ms: Math.round(now() - t2),
    input: { tauForm: config.tauForm, minSize: config.minSize, minDays: config.minDays, clusters: clusters.map(summarise) },
    output: {
      candidates: candidates.map(summarise),
      rejected: rejected.map(({ cluster, reason }) => ({ ...summarise(cluster), reason })),
    },
  });

  return { vectors, ids, matrix, clusters, candidates, rejected, edges, excluded };
}
