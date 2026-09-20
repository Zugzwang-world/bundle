// Starts stage runs. Uses src/engine/pipeline.js (the integrator's) when it exists, else the
// scripted mock. Builds the ctx every run gets, and — in story mode — holds the run's final
// reducer dispatch (BUNDLES_FORMED / BUNDLE_ATTACHED) until the story clock reaches the
// Stability → render card, so the sidebar updates in sync with it (B8).
import { INCOMING_CHATS, MEERA_CHATS, FRESH_CHATS } from '../data/chats';
import { isBundleCandidate } from '../state/store';
import { mockForm, mockAttach } from './mock.js';
import { stagesFor } from './story.js';
import { advance, emit, getSnapshot, startRun, subscribe } from './trace.js';

/* ── pipeline discovery ─────────────────────────────────────────────
   import.meta.glob resolves to {} at build time while the file is absent and to a lazy
   loader once it exists — no unresolvable specifier for Rollup, nothing bundled twice.
   Outside Vite (the esbuild smoke) import.meta.glob is undefined: caught, no pipeline. */
let pipelinePromise = null;
export function loadPipeline() {
  if (pipelinePromise) return pipelinePromise;
  pipelinePromise = (async () => {
    try {
      const mods = import.meta.glob('../engine/pipeline.js');
      const load = mods['../engine/pipeline.js'];
      if (!load) return null;
      const mod = await load();
      return mod && (typeof mod.runForm === 'function' || typeof mod.runAttach === 'function') ? mod : null;
    } catch {
      return null;
    }
  })();
  return pipelinePromise;
}

/* ── the cards a run sees ───────────────────────────────────────────
   Every candidate chat of the current life (INV-4 candidacy rule, deleted chats gone).
   This is the engine's *input*, not bundle membership — membership stays in selectIndex. */
export function cardsFor(state) {
  const base = state.scenario === 'meera' ? MEERA_CHATS : FRESH_CHATS;
  const arrivals = INCOMING_CHATS.filter((ch) => state.arrivals.includes(ch.id));
  const live = state.scenario === 'meera' ? state.liveChats || [] : [];
  return [...live, ...arrivals, ...base].filter((ch) => !state.deleted[ch.id]).filter(isBundleCandidate);
}

/* ── deferred final dispatch ────────────────────────────────────────── */
const FINAL = new Set(['BUNDLES_FORMED', 'BUNDLE_ATTACHED']);
const parked = new Map(); // runId -> { action, dispatch, timer }

function storyReachedRender(snap, runId) {
  const run = snap.runs.find((r) => r.id === runId);
  if (!run) return true;
  const last = stagesFor(run.kind).length - 1;
  return snap.story.runId !== runId || snap.story.cursor >= last;
}

function shouldFlush(snap, runId) {
  return !snap.visible || snap.mode !== 'story' || snap.current?.id !== runId || storyReachedRender(snap, runId);
}

function flush(runId) {
  const p = parked.get(runId);
  if (!p) return;
  parked.delete(runId);
  clearTimeout(p.timer);
  p.dispatch(p.action);
}

subscribe(() => {
  const snap = getSnapshot();
  for (const runId of [...parked.keys()]) if (shouldFlush(snap, runId)) flush(runId);
});

function pacedDispatch(dispatch, runId) {
  return (action) => {
    if (!action || !FINAL.has(action.type) || shouldFlush(getSnapshot(), runId)) return dispatch(action);
    // Park it; the subscriber above releases it when the story reaches Render (or is not
    // being watched). A 40 s ceiling guarantees the reducer always hears the result.
    flush(runId); // never hold two results for one run
    parked.set(runId, { action, dispatch, timer: setTimeout(() => flush(runId), 40000) });
    return undefined;
  };
}

/* ── ctx ───────────────────────────────────────────────────────────
   What runForm / runAttach receive. pipeline.js reads `ctx.runId ?? ctx.state.runId` as the
   id it puts on BUNDLES_FORMED, so for Form `runId` is the reducer's number; the trace's own
   run id is `traceRunId`, and `emit` stamps it on every event whatever the pipeline set. */
function makeCtx({ kind, state, dispatch, cards, chat, card }) {
  const traceRunId = startRun(kind, { chat, cards, reducerRunId: state.runId });
  const send = (event) => emit({ ...event, runId: traceRunId });
  // The Card stage: fixtures ship with theirs; a live chat's card was written by Claude in the
  // composer (LiveChat passes that result so its raw request/response show in inspect mode).
  const first = chat ? { title: chat.title, summary: chat.summary } : null;
  send({
    stage: 'card',
    status: 'done',
    ms: card?.ms || 0,
    input: chat ? { chatId: chat.id } : { count: cards.length },
    output: kind === 'attach'
      ? { ...first, source: chat?.source === 'new' ? 'claude' : 'fixture' }
      : first ? { ...first, count: cards.length } : { count: cards.length, note: 'Fixtures ship with their cards; nothing to write.' },
    raw: card?.raw || null,
  });
  return {
    runId: kind === 'form' ? state.runId : traceRunId,
    traceRunId,
    state, // reducer state at the moment the run started
    dispatch: pacedDispatch(dispatch, traceRunId),
    emit: send,
    // The run is already open; a pipeline calling startRun(kind, id) gets the same trace run
    // back while it has only the Card event, so it cannot fork the trace by accident.
    startRun: (k) => {
      const cur = getSnapshot().current;
      const untouched = cur && cur.id === traceRunId && cur.events.every((e) => e.stage === 'card');
      return untouched && (!k || k === kind) ? traceRunId : startRun(k || kind, { chat, cards, reducerRunId: state.runId });
    },
    advance: () => advance(traceRunId),
    cards, // every other candidate chat (for Attach: the centroids' members)
    chat,
  };
}

/* ── entry points ───────────────────────────────────────────────────── */
let lastFormRunId = -1;

// Called whenever phase becomes 'generating' with the live engine (toggle on, Try again,
// memory resume). Idempotent per reducer runId — StrictMode's double effect starts one run.
export async function runForm({ state, dispatch }) {
  if (state.runId === lastFormRunId) return;
  lastFormRunId = state.runId;
  const cards = cardsFor(state);
  const chat = state.liveChats?.[0] || null; // the chip follows the newest live chat
  const ctx = makeCtx({ kind: 'form', state, dispatch, cards, chat });
  const mod = await loadPipeline();
  try {
    if (mod?.runForm) await mod.runForm(cards, ctx);
    else await mockForm({ cards, ...ctx });
  } catch (err) {
    fail(ctx, err, () => dispatch({ type: 'GENERATION_FAILED', runId: state.runId, error: String(err?.message || err) }));
  }
}

let lastAttach = null;

export async function runAttach(chat, { state, dispatch, card = null }) {
  if (!chat) return;
  lastAttach = { chat, dispatch, card };
  const cards = cardsFor(state).filter((c) => c.id !== chat.id);
  const ctx = makeCtx({ kind: 'attach', state, dispatch, cards, chat, card });
  const mod = await loadPipeline();
  try {
    if (mod?.runAttach) await mod.runAttach(chat, ctx);
    else await mockAttach(chat, { cards, ...ctx });
  } catch (err) {
    fail(ctx, err);
  }
}

// Mark the running card (or the last known one) as failed so the stage shows Try again.
function fail(ctx, err, then) {
  const snap = getSnapshot();
  const run = snap.runs.find((r) => r.id === ctx.traceRunId);
  if (run?.events.some((e) => e.status === 'error')) return; // the pipeline already marked it
  const running = run?.events.find((e) => e.status === 'running') || run?.events[run.events.length - 1];
  emit({ runId: ctx.traceRunId, stage: running?.stage || 'card', status: 'error', error: String(err?.message || err) });
  if (then) then();
}

// Try again from a failed card: Form goes through the reducer (RETRY → generating → runForm);
// Attach re-runs the same chat.
export function retry(run, { state, dispatch }) {
  if (run?.kind === 'attach' && lastAttach) return runAttach(lastAttach.chat, { state, dispatch, card: lastAttach.card });
  return dispatch({ type: 'RETRY' });
}

// RESET / scenario swap: forget the last reducer runId so runId 1 of the next life runs again.
export function resetRunner() {
  lastFormRunId = -1;
  lastAttach = null;
  for (const id of [...parked.keys()]) { clearTimeout(parked.get(id).timer); parked.delete(id); }
}
