// Scripted stage runs — the stand-in for src/engine/pipeline.js until the integrator writes it.
// Emits a realistic event sequence (shapes per docs/CONTRACT.md) over ~20 s (Form) / ~12 s
// (Attach) and ends by dispatching BUNDLES_FORMED / BUNDLE_ATTACHED with the fixture groups.
// The mock is the only thing in the demo allowed to read a chat's fixture `concern` hint.
import { CONCERNS } from '../data/chats';
import { CONFIG } from '../engine/config.js';
import { getSnapshot } from './trace.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (x) => Math.round(x * 1000) / 1000;

// Deterministic pseudo-random in [0,1) from a string — the same life draws the same map.
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

const NAMES = {
  retirement: { name: 'Retirement planning', domain: 'Finances', concern: 'Making pension and savings decisions for retirement.' },
  apartment: { name: 'Apartment hunt', domain: 'Housing', concern: 'Finding and buying a flat in Mumbai.' },
  spanish: { name: 'Spanish practice', domain: 'Language learning', concern: 'Learning Spanish, a few phrases and rules at a time.' },
  health: { name: 'Chest pain worries', domain: 'Health', concern: 'Following up on heart and blood-sugar symptoms with doctors.', sensitive: true },
};

function groupsOf(cards) {
  const byKey = {};
  for (const c of cards) if (c.concern && CONCERNS[c.concern]) (byKey[c.concern] ||= []).push(c.id);
  return byKey;
}

// Similarity between two cards, from the concern hints plus a stable jitter.
function sim(a, b) {
  const j = hash(a.id + '|' + b.id);
  if (a.concern && a.concern === b.concern) return 0.56 + j * 0.3;
  if (a.concern && b.concern) return 0.18 + j * 0.3;
  return 0.08 + j * 0.34;
}

function mapOf(cards, newChat) {
  const edges = [];
  const near = {};
  for (let i = 0; i < cards.length; i++) {
    const scores = [];
    for (let j = 0; j < cards.length; j++) {
      if (i === j) continue;
      const s = round(sim(cards[i], cards[j]));
      scores.push({ id: cards[j].id, score: s });
      if (j > i && s >= CONFIG.tauEdge) edges.push({ a: cards[i].id, b: cards[j].id, score: s });
    }
    scores.sort((x, y) => y.score - x.score);
    near[cards[i].id] = scores.slice(0, 3);
  }
  return { edges, neighbours: near, nodes: cards.map((c) => ({ id: c.id, title: c.title, group: null })), newId: newChat?.id || null };
}

const vectorSample = (seed) => Array.from({ length: 8 }, (_, i) => round((hash(seed + i) - 0.5) * 0.24));

function fakeRaw(tool, content, input) {
  return {
    request: {
      model: 'claude-fable-5-1',
      max_tokens: 1500,
      system: `(mock) You must respond by calling the ${tool} tool exactly once.`,
      messages: [{ role: 'user', content: input }],
      tools: [{ name: tool }],
      tool_choice: { type: 'auto' },
    },
    response: {
      id: `msg_mock_${tool}`,
      type: 'message',
      role: 'assistant',
      model: 'claude-fable-5-1',
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: `toolu_mock_${tool}`, name: tool, input: content }],
      usage: { input_tokens: 812, output_tokens: 96 },
    },
  };
}

function bundleName(state, id) {
  return state.names?.[id] || state.bundles?.find((b) => b.id === id)?.name || NAMES[id]?.name || CONCERNS[id]?.defaultName || id;
}

/* ── Form ─────────────────────────────────────────────────────────── */
export async function mockForm({ cards, state, dispatch, emit, runId, traceRunId = runId }) {
  const alive = () => getSnapshot().current?.id === traceRunId;
  const send = (stage, status, fields = {}) => alive() && emit({ runId, stage, status, ms: 0, input: null, output: null, raw: null, ...fields });
  const newChat = cards.find((c) => c.source === 'new') || null;
  const groups = groupsOf(cards);

  // card — the runner already emitted it (fixtures ship with theirs); just hold a beat.
  await wait(1200);

  // embed
  await wait(200);
  send('embed', 'running', { input: { count: cards.length, model: CONFIG.embedModel } });
  for (let p = 8; p <= cards.length; p += 8) {
    await wait(520);
    send('embed', 'running', { input: { count: cards.length, model: CONFIG.embedModel }, output: { progress: Math.min(p, cards.length), count: cards.length } });
  }
  await wait(300);
  send('embed', 'done', { ms: 2860, output: { count: cards.length, dims: 384, ms: 2860, sample: vectorSample(newChat?.id || cards[0]?.id || 'x') } });

  // map
  await wait(200);
  send('map', 'running', { input: { count: cards.length, tauEdge: CONFIG.tauEdge } });
  await wait(1800);
  const map = mapOf(cards, newChat);
  send('map', 'done', { ms: 41, input: { count: cards.length, tauEdge: CONFIG.tauEdge }, output: map });

  // rules
  await wait(300);
  const rulesIn = { tauForm: CONFIG.tauForm, minSize: CONFIG.minSize, minDays: CONFIG.minDays };
  send('rules', 'running', { input: rulesIn });
  await wait(2000);
  const idsOf = (list) => list.filter((id) => cards.some((c) => c.id === id));
  const candidates = Object.entries(groups)
    .filter(([, ids]) => ids.length >= CONFIG.minSize)
    .map(([key, ids]) => ({ key, chatIds: ids, cohesion: round(0.6 + hash(key) * 0.2), days: new Set(ids.map((id) => cards.find((c) => c.id === id)?.date)).size }));
  const rejected = [
    { key: 'c_u3_u8', chatIds: idsOf(['u3', 'u8']), cohesion: 0.612, days: 2, reason: 'too_few' },
    { key: 'c_u1_u2_u4_u6', chatIds: idsOf(['u1', 'u2', 'u4', 'u6']), cohesion: 0.487, days: 1, reason: 'not_ongoing' },
  ].filter((r) => r.chatIds.length > 0);
  send('rules', 'done', { ms: 12, input: { ...rulesIn, clusters: [...candidates, ...rejected.map(({ reason: _reason, ...c }) => c)] }, output: { candidates, rejected } });

  // name — this is where a failing run fails (D9)
  await wait(300);
  send('name', 'running', { input: { clusters: candidates.length } });
  await wait(2200);
  if (state.failNext) {
    send('name', 'error', { ms: 2200, error: 'API error 529: Overloaded — the naming call did not complete.' });
    dispatch({ type: 'GENERATION_FAILED', runId: state.runId, error: 'API error 529: Overloaded' });
    return;
  }
  const names = candidates.map((c) => ({ key: c.key, ...NAMES[c.key], language: 'en', sensitive: Boolean(NAMES[c.key]?.sensitive) }));
  send('name', 'done', {
    ms: 3120,
    output: { names },
    raw: fakeRaw('emit_name', names[0] || {}, `Members:\n${(candidates[0]?.chatIds || []).map((id) => '- ' + cards.find((c) => c.id === id)?.title).join('\n')}`),
  });

  // gate
  await wait(300);
  send('gate', 'running', { input: { names: names.map((n) => n.name) } });
  await wait(2400);
  const gates = names.map((n) =>
    n.key === 'health'
      ? { key: n.key, name: n.name, decision: 'downgrade', replacement: 'Health', layer: 1, term: 'chest pain', category: 'symptoms', reason: 'Lexicon hit: "chest pain" is a symptom. Downgraded to the domain word.' }
      : { key: n.key, name: n.name, decision: 'pass', layer: 2, reason: 'Names a domain or activity, not a struggle.' },
  );
  send('gate', 'done', {
    ms: 1980,
    output: { gates },
    raw: fakeRaw('emit_gate', { decision: 'pass', reason: 'Names an activity.' }, `Name: "${names[0]?.name}"`),
  });

  // merge → render
  await wait(300);
  send('merge', 'running', { input: { names: Object.keys(state.names || {}).length, removed: Object.keys(state.removed || {}).length, hidden: Object.keys(state.hidden || {}).length } });
  await wait(1500);
  const bundles = candidates.map((c) => {
    const n = names.find((x) => x.key === c.key) || {};
    const g = gates.find((x) => x.key === c.key) || {};
    return {
      id: c.key,
      name: g.decision === 'downgrade' ? g.replacement : n.name,
      nameSource: 'model',
      domain: n.domain || null,
      language: n.language || 'en',
      sensitive: Boolean(n.sensitive),
      concern: n.concern || '',
      chatIds: c.chatIds,
    };
  });
  const overrides = [];
  for (const b of bundles) {
    if (state.names?.[b.id]) overrides.push({ rule: 1, detail: `${b.id}: kept your name "${state.names[b.id]}" over the model's "${b.name}".` });
    const dropped = b.chatIds.filter((id) => state.removed?.[id]);
    if (dropped.length) overrides.push({ rule: 2, detail: `${b.id}: ${dropped.length} removed chat${dropped.length > 1 ? 's' : ''} not re-added.` });
    if (state.hidden?.[b.id]) overrides.push({ rule: 3, detail: `${b.id}: stays hidden.` });
    if (state.bundles?.some((p) => p.id === b.id)) overrides.push({ rule: 5, detail: `${b.id}: name frozen from the first run.` });
  }
  send('merge', 'done', { ms: 3, output: { bundles: bundles.map((b) => ({ id: b.id, name: b.name, chatIds: b.chatIds })), overrides } });
  await wait(300);
  send('render', 'done', { ms: 0, output: { bundles: bundles.length, rejected: rejected.length } });
  if (!alive()) return;
  dispatch({ type: 'BUNDLES_FORMED', runId: state.runId, bundles, rejected: rejected.map(({ reason, ...cluster }) => ({ cluster, reason })), overrides });
}

/* ── Attach ───────────────────────────────────────────────────────── */
export async function mockAttach(chat, { cards, state, dispatch, emit, runId, traceRunId = runId }) {
  const alive = () => getSnapshot().current?.id === traceRunId;
  const send = (stage, status, fields = {}) => alive() && emit({ runId, stage, status, ms: 0, input: null, output: null, raw: null, ...fields });
  const bundleIds = (state.bundles || Object.values(CONCERNS).map((c) => ({ id: c.key }))).map((b) => b.id).filter((id) => !state.hidden?.[id]);

  // The runner already emitted the Card stage; a live chat's card carries Claude's real
  // request/response from the composer, which the mock must not paper over.
  const existingCard = getSnapshot().current?.events.find((e) => e.stage === 'card');
  await wait(1000);
  if (!existingCard?.raw) {
    send('card', 'done', { ms: existingCard?.ms || 0, output: { title: chat.title, summary: chat.summary, source: 'fixture' }, raw: null });
  }

  await wait(200);
  send('embed', 'running', { input: { count: 1, model: CONFIG.embedModel } });
  await wait(1900);
  send('embed', 'done', { ms: 96, output: { count: 1, dims: 384, ms: 96, sample: vectorSample(chat.id) } });

  await wait(300);
  send('attach', 'running', { input: { tauAttach: CONFIG.tauAttach, delta: CONFIG.delta, bundles: bundleIds.length } });
  await wait(3000);
  const text = `${chat.title} ${chat.summary || ''}`.toLowerCase();
  const ambiguous = /spanish|español/.test(text) && /landlord|rent|flat|apartment/.test(text);
  const pick = chat.concern && bundleIds.includes(chat.concern) ? chat.concern : bundleIds[0] || null;
  const runnerUp = ambiguous ? (pick === 'spanish' ? 'apartment' : 'spanish') : bundleIds.find((id) => id !== pick) || null;
  const scores = bundleIds
    .map((id) => ({
      id,
      name: bundleName(state, id),
      score: id === pick ? 0.71 : id === runnerUp ? (ambiguous ? 0.68 : 0.41) : round(0.12 + hash(chat.id + id) * 0.2),
    }))
    .sort((a, b) => b.score - a.score);
  const all = [...cards, chat];
  const near = all
    .filter((c) => c.id !== chat.id)
    .map((c) => ({ id: c.id, score: round(sim(chat, c)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const edges = near.filter((n) => n.score >= CONFIG.tauEdge).map((n) => ({ a: chat.id, b: n.id, score: n.score }));
  const groups = groupsOf(cards);
  send('attach', 'done', {
    ms: 4,
    output: {
      bundleId: ambiguous ? null : pick,
      runnerUp,
      scores,
      tie: ambiguous,
      neighbours: near,
      edges,
      nodes: all.map((c) => ({ id: c.id, title: c.title, group: Object.keys(groups).find((k) => groups[k].includes(c.id)) || null })),
      newId: chat.id,
    },
  });

  await wait(300);
  let reason;
  if (ambiguous) {
    send('tiebreak', 'running', { input: { candidates: [pick, runnerUp].map((id) => ({ id, name: bundleName(state, id) })) } });
    await wait(2200);
    reason = 'The chat is about saying something in Spanish; the rent is the sentence, not the concern.';
    const out = { bundle_id: pick, runner_up: runnerUp, reason };
    send('tiebreak', 'done', { ms: 2470, output: out, raw: fakeRaw('emit_tiebreak', out, `New chat: ${chat.title}`) });
  } else {
    reason = `Nearest centroid ${scores[0]?.score} vs ${scores[1]?.score ?? '—'} — gap wider than δ ${CONFIG.delta}, no tie-break needed.`;
    send('tiebreak', 'done', { ms: 0, output: { skipped: true, reason } });
  }

  await wait(300);
  send('merge', 'running', { input: { rule: 4 } });
  await wait(1100);
  send('merge', 'done', { ms: 1, output: { attached: pick, runnerUp, reason, overrides: [{ rule: 4, detail: 'Attach adds one chat; nothing renamed, nothing else moved.' }] } });
  await wait(200);
  send('render', 'done', { ms: 0, output: { attached: pick } });
  if (!alive()) return;
  dispatch({ type: 'BUNDLE_ATTACHED', chatId: chat.id, bundleId: pick, runnerUp, reason });
}
