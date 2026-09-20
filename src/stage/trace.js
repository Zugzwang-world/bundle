// The stage trace — a tiny external store the stage view renders from.
//
//   startRun(kind, meta) → runId      opens a run { id, kind, startedAt, events: [], ...meta }
//   emit(event)                        upserts by event.stage inside the run event.runId names
//                                      (default: the current run), so running → done updates
//                                      the same card
//   useTrace() → { runs, current, mode, story, visible }
//   subscribe(fn), getSnapshot(), reset()
//
// The story clock (mode / cursor) lives here too, rather than in the Stage component, so the
// runner can hold the final dispatch until the story reaches the Render card even when the
// Stage is collapsed — and flush it the moment the story is not being watched.
import { useSyncExternalStore } from 'react';

const EMPTY = Object.freeze({
  runs: [],
  current: null,
  mode: 'story', // 'story' | 'inspect'
  visible: true, // the Stage pane is open (not collapsed)
  story: { runId: null, cursor: 0, enteredAt: 0 }, // the story clock
});

let snap = EMPTY;
const listeners = new Set();
let seq = 0;

const now = () => Date.now();

function set(next) {
  snap = next;
  for (const fn of listeners) fn();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getSnapshot = () => snap;
const getServerSnapshot = () => EMPTY;

export function startRun(kind, meta = {}) {
  const id = `${kind}-${++seq}-${now().toString(36)}`;
  const run = { id, kind, startedAt: now(), events: [], ...meta };
  set({
    ...snap,
    runs: [...snap.runs, run],
    current: run,
    visible: true, // a new run re-opens a collapsed stage
    story: { runId: id, cursor: 0, enteredAt: now() },
  });
  return id;
}

export function emit(event) {
  if (!event || !event.stage) return;
  const runId = event.runId || snap.current?.id;
  const idx = snap.runs.findIndex((r) => r.id === runId);
  if (idx < 0) return; // an event for a run we never started — drop it
  const run = snap.runs[idx];
  const i = run.events.findIndex((e) => e.stage === event.stage);
  const t = now();
  const merged =
    i >= 0
      ? { ...run.events[i], ...event, runId, updatedAt: t }
      : { id: event.id || `${runId}-${event.stage}`, status: 'running', input: null, output: null, raw: null, ...event, runId, firstAt: t, updatedAt: t };
  const events = i >= 0 ? run.events.map((e, j) => (j === i ? merged : e)) : [...run.events, merged];
  const next = { ...run, events };
  const runs = snap.runs.map((r, j) => (j === idx ? next : r));
  set({ ...snap, runs, current: snap.current?.id === runId ? next : snap.current });
}

export function setMode(mode) {
  if (mode === snap.mode) return;
  set({ ...snap, mode });
}

export function setVisible(visible) {
  if (visible === snap.visible) return;
  set({ ...snap, visible });
}

// Story clock: advance the cursor of the given run by one card.
export function advance(runId) {
  if (snap.story.runId !== runId) return;
  set({ ...snap, story: { runId, cursor: snap.story.cursor + 1, enteredAt: now() } });
}

export function reset() {
  set({ ...EMPTY, mode: snap.mode });
}

export function useTrace() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Convenience for non-React callers.
export const trace = { startRun, emit, subscribe, getSnapshot, setMode, setVisible, advance, reset };
