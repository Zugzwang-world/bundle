// Integration glue: the Form and Attach runs. Code stages come from src/engine/form.js and
// friends; Claude is called only for naming, gating and tie-breaking. Every stage emits a
// stage event (docs/CONTRACT.md) so the stage view can show what happened.
import { CONFIG } from './config.js';
import { formClusters } from './form.js';
import { embedText } from './embed.js';
import { centroid } from './cluster.js';
import { nearest } from './attach.js';
import { cosine } from './similarity.js';
import { nameCluster, isNonName } from './name.js';
import { tieBreak } from './tiebreak.js';
import { gateName } from '../safety/gate.js';
import { mergeBundles } from './merge.js';

// Vectors from the last Form run, so Attach can build centroids without re-embedding.
let lastVectors = new Map();

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function mkEmit(ctx, runId) {
  return (stage, status, extra = {}) =>
    ctx.emit({ id: `${runId}:${stage}`, runId, stage, status, ms: 0, input: null, output: null, raw: null, ...extra });
}

const pick = (cards) => cards.map((c) => ({ id: c.id, title: c.title, summary: c.summary, date: c.date }));

/**
 * runForm(cards, ctx)
 * cards: every bundle-candidate chat (no project chats), each { id, title, summary, date, concern? }
 * ctx: { state, dispatch, emit, startRun, runId? }
 */
export async function runForm(cards, ctx) {
  const runId = ctx.runId ?? ctx.state.runId;
  ctx.startRun?.('form', runId);
  const emit = mkEmit(ctx, runId);
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  let stage = 'embed';
  try {
    // ── code stages: embed → map → rules ────────────────────────────────
    const formed = await formClusters(cards, CONFIG, { onEvent: (e) => { stage = e.stage; ctx.emit({ ...e, runId, id: `${runId}:${e.stage}` }); } });
    lastVectors = formed.vectors instanceof Map ? formed.vectors : new Map(Object.entries(formed.vectors || {}));

    // ── Claude: name each candidate, then gate every name ───────────────
    stage = 'name';
    const names = [];
    const rejected = [...formed.rejected.map((r) => ({ chatIds: r.cluster.chatIds, reason: r.reason }))];
    const nameOut = [];
    const gateOut = [];
    emit('name', 'running', { input: { candidates: formed.candidates.length } });
    // All candidates are named in parallel: each call is independent, and the booth waits.
    await Promise.all(formed.candidates.map(async (cluster, i) => {
      const members = cluster.chatIds.map((id) => byId[id]).filter(Boolean);
      const t0 = now();
      const res = await nameCluster(pick(members));
      const out = res.output || {};
      const refused = out.refuse || !out.name || isNonName(out.name);
      nameOut[i] = { key: cluster.key, size: members.length, proposed: refused ? null : out.name, refused, domain: out.domain || null, language: out.language || null, sensitive: !!out.sensitive, concern: out.concern || null, reason: out.reason || null, raw: res.raw, ms: Math.round(now() - t0) };
      if (refused) { rejected.push({ chatIds: cluster.chatIds, reason: 'no_specific_name', detail: out.reason }); return; }
      names.push({ key: cluster.key, ...out, proposed: out.name });
    }));
    emit('name', 'done', { output: { results: nameOut.filter(Boolean).map(({ raw, ...r }) => r), rejected: rejected.filter((r) => r.reason === 'no_specific_name') }, raw: { calls: nameOut.filter(Boolean).map((r) => r.raw) } });

    stage = 'gate';
    emit('gate', 'running', { input: { names: names.map((n) => n.name) } });
    const kept = [];
    await Promise.all(names.map(async (n, i) => {
      const cluster = formed.candidates.find((c) => c.key === n.key);
      const members = cluster.chatIds.map((id) => byId[id]);
      const t0 = now();
      const g = await gateName({ name: n.name, domain: n.domain, sensitive: n.sensitive }, pick(members));
      gateOut[i] = { key: n.key, proposed: n.name, decision: g.decision, final: g.name, layer: g.layer, reason: g.reason, term: g.term || null, raw: g.raw, ms: Math.round(now() - t0) };
      if (g.decision === 'refuse' || !g.name) { rejected.push({ chatIds: cluster.chatIds, reason: 'no_specific_name', detail: g.reason }); return; }
      kept.push({ ...n, name: g.name, gated: g.decision !== 'pass' });
    }));
    emit('gate', 'done', { output: { results: gateOut.filter(Boolean).map(({ raw, ...r }) => r) }, raw: { calls: gateOut.filter(Boolean).map((r) => r.raw).filter(Boolean) } });

    // ── merge: stability rules over the reducer state ───────────────────
    stage = 'merge';
    emit('merge', 'running');
    const clusters = formed.candidates.filter((c) => kept.some((k) => k.key === c.key)).map(({ centroid: _c, ...c }) => c);
    const { bundles, overrides } = mergeBundles(ctx.state, { clusters, names: kept }, byId);
    emit('merge', 'done', { output: { bundles: bundles.map((b) => ({ id: b.id, name: b.name, nameSource: b.nameSource, size: b.chatIds.length })), overrides, rejected } });

    ctx.dispatch({ type: 'BUNDLES_FORMED', runId, bundles, rejected, overrides });
    emit('render', 'done', { output: { bundles: bundles.length, chats: cards.length } });
    return { bundles, rejected, overrides, formed };
  } catch (err) {
    emit(stage, 'error', { error: err.message || String(err) });
    ctx.dispatch({ type: 'GENERATION_FAILED', runId, error: err.message });
    throw err;
  }
}

async function vectorFor(chat) {
  const cached = lastVectors.get(chat.id);
  if (cached) return cached;
  const v = await embedText(`${chat.title}. ${chat.summary || ''}`);
  lastVectors.set(chat.id, v);
  return v;
}

/**
 * runAttach(card, ctx)
 * card: the new chat { id, title, summary, date }
 * ctx: { state, dispatch, emit, startRun, cards (all chats, for centroids), runId? }
 */
export async function runAttach(card, ctx) {
  const runId = ctx.runId ?? `attach-${card.id}`;
  ctx.startRun?.('attach', runId);
  const emit = mkEmit(ctx, runId);
  const byId = Object.fromEntries((ctx.cards || []).map((c) => [c.id, c]));
  let stage = 'embed';
  try {
    const t0 = now();
    emit('embed', 'running', { input: { text: `${card.title}. ${card.summary || ''}` } });
    const v = await vectorFor(card);
    emit('embed', 'done', { ms: Math.round(now() - t0), output: { dims: v.length, sample: Array.from(v.slice(0, 8)).map((x) => +x.toFixed(4)) } });

    stage = 'attach';
    emit('attach', 'running');
    const visible = (ctx.state.bundles || []).filter((b) => !ctx.state.hidden?.[b.id]);
    const withCentroids = [];
    for (const b of visible) {
      const vecs = [];
      for (const id of b.chatIds) { const ch = byId[id]; if (ch && !ctx.state.removed?.[id]) vecs.push(await vectorFor(ch)); }
      if (vecs.length) withCentroids.push({ id: b.id, name: b.name, concern: b.concern, chatIds: b.chatIds, centroid: centroid(vecs) });
    }
    const near = nearest(v, withCentroids, CONFIG);
    const nameOf = (id) => withCentroids.find((b) => b.id === id)?.name || null;
    // Nearest individual chats, for the map card: every cached vector scored against the new one.
    const scored = [];
    for (const [id, vec] of lastVectors) if (id !== card.id && byId[id]) scored.push({ id, score: +cosine(v, vec).toFixed(3) });
    scored.sort((a, b) => b.score - a.score);
    const neighbours = scored.slice(0, 3);
    const edges = scored.filter((s) => s.score >= CONFIG.tauEdge).map((s) => ({ a: card.id, b: s.id, score: s.score }));
    emit('attach', 'done', { ms: Math.round(now() - t0), output: { scores: near.scores.map((s) => ({ ...s, name: nameOf(s.id) })), bundleId: near.bundleId, runnerUp: near.runnerUp, tie: near.tie, tauAttach: CONFIG.tauAttach, delta: CONFIG.delta, neighbours, edges, nodes: [...lastVectors.keys()].filter((id) => byId[id] || id === card.id).map((id) => ({ id, title: byId[id]?.title || card.title })) } });

    let bundleId = near.bundleId;
    let runnerUp = near.runnerUp;
    let reason = bundleId
      ? `Nearest bundle centroid (${near.scores[0].score.toFixed(2)} ≥ τ_attach ${CONFIG.tauAttach}).`
      : `No bundle centroid within τ_attach ${CONFIG.tauAttach}; the chat stays in the list.`;

    if (near.tie && near.scores.length >= 2) {
      stage = 'tiebreak';
      const cands = near.scores.slice(0, 2).map((s) => { const b = withCentroids.find((x) => x.id === s.id); return { id: b.id, name: b.name, concern: b.concern, sample: b.chatIds.slice(0, 4).map((id) => byId[id]?.title).filter(Boolean) }; });
      emit('tiebreak', 'running', { input: { candidates: cands.map((c) => c.name), scores: near.scores.slice(0, 2) } });
      const t1 = now();
      const tb = await tieBreak({ title: card.title, summary: card.summary }, cands);
      bundleId = tb.output.bundle_id || null;
      runnerUp = tb.output.runner_up || cands.find((c) => c.id !== bundleId)?.id || null;
      reason = tb.output.reason || reason;
      emit('tiebreak', 'done', { ms: Math.round(now() - t1), output: { bundleId, bundle: nameOf(bundleId), runnerUp, runnerUpName: nameOf(runnerUp), reason }, raw: tb.raw });
    } else {
      emit('tiebreak', 'done', { output: { skipped: true, reason: 'Top two are not within δ; no tie-break needed.' } });
    }

    stage = 'merge';
    ctx.dispatch({ type: 'BUNDLE_ATTACHED', chatId: card.id, bundleId, runnerUp, reason });
    emit('merge', 'done', { output: { rule: 'B6.4 — attach never renames and never moves any chat except the new one', chatId: card.id, bundleId, bundle: nameOf(bundleId), runnerUp: nameOf(runnerUp), reason } });
    return { bundleId, runnerUp, reason };
  } catch (err) {
    emit(stage, 'error', { error: err.message || String(err) });
    throw err;
  }
}
