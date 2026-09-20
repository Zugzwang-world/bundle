import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { CONCERNS, MEERA_CHATS, FRESH_CHATS, INCOMING_CHATS, byNewest } from '../data/chats';

/*
  Bundle prototype state — every transition maps to the spec (ZW-FS-001).

  phase: 'off' | 'generating' | 'ready' | 'thin' | 'failed' | 'paused'
    off        §9 OFF — the product as it is today
    generating §9 GENERATING — skeletons above, list untouched (J-1)
    ready      §9 READY — bundles above, All chats beneath
    thin       §9 TOO LITTLE HISTORY
    failed     §9 COULDN'T BUNDLE — list untouched, retry one tap (A12)
    paused     J-7 — memory turned off while Bundle was on

  Corrections (names / removed / hidden / collapsed) persist across
  off→on and across memory pauses — §11, Q2, J-6 ("resumes rather than restarts") —
  and across reloads (D7): see the persistence block at the bottom of this file.

  engine: 'sim' | 'live'
    sim   v0.1 path — the provider's timer resolves 'generating' with GENERATION_DONE and
          selectIndex groups by the fixtures' `concern` (state.bundles stays null).
    live  v0.2 path — whenever phase becomes 'generating', the pipeline (UI lane /
          src/engine/pipeline.js) runs Form with state.runId and dispatches
          BUNDLES_FORMED or GENERATION_FAILED carrying that runId. The timer is off.
*/

export const JOURNEYS = [
  { id: 'J1', label: 'Turn Bundle on', hint: 'Flip the toggle on Chats and tasks.' },
  { id: 'J2', label: 'A new chat joins its bundle', hint: 'Demo controls › "A new chat arrives".' },
  { id: 'J3', label: 'Rename a bundle', hint: 'Bundle menu (···) › Rename bundle.' },
  { id: 'J4', label: 'Remove a chat from a bundle', hint: 'Row menu (···) › Remove from bundle.' },
  { id: 'J5', label: 'Hide a bundle', hint: 'Bundle menu (···) › Hide bundle.' },
  { id: 'J6', label: 'Turn Bundle off — then back on', hint: 'Off restores the list; on resumes your corrections.' },
  { id: 'J7', label: 'Hit the memory dependency', hint: 'Turn memory off in Settings (top-right gear).' },
];

export const freshState = (scenario = 'meera') => ({
  scenario, // 'meera' | 'fresh'
  memoryOn: true,
  bundleOn: false,
  phase: 'off',
  pausedFrom: null,
  everFormed: false,
  noteDismissed: false, // "Bundled by Claude…" first-formation note (§9.1)
  names: {}, // bundleId (concernKey in the sim path) -> person's name (INV-3: never overwritten)
  removed: {}, // chatId -> true (J-4: a removal is remembered)
  hidden: {}, // bundleId -> true (J-5/R3: stays hidden)
  collapsed: { apartment: true, spanish: true }, // chevron state persists per bundle (Fig. 4)
  deleted: {}, // chatId -> true (A14: delete behaves exactly as today)
  arrivals: [], // simulated incoming chats (J-2)
  liveChats: [], // real chats created in the demo, carded by Claude (v0.2 beat 1)
  failNext: false,
  highlightId: null, // freshly-joined chat, briefly marked
  toast: null, // { id, text, undo: {type, payload} | null }
  renaming: null, // bundleId during inline rename
  journeys: {},
  runId: 0, // increments per generation run (timer / pipeline identity)
  engine: 'sim', // 'sim' | 'live' — see header
  bundles: null, // null until an engine run; then Bundle[] (CONTRACT.md shape)
  rejected: [], // [{ cluster, reason }] from the last Form run (D4)
  overrides: [], // [{ rule, detail }] — what the merge overrode (Merge stage card)
  lastAttach: null, // { chatId, bundleId, runnerUp, reason } from the last Attach run (D6)
});

function mark(state, j) {
  if (state.journeys[j]) return state.journeys;
  return { ...state.journeys, [j]: true };
}

// A bundle counts as formed when at least one of its chats can still render
// (not removed, not deleted). Hidden bundles still count: hiding is the person's
// choice, and "too little history" would be the wrong sentence for it.
function anyVisibleChat(state, bundles) {
  return bundles.some((b) => b.chatIds.some((id) => !state.removed[id] && !state.deleted[id]));
}

function normaliseBundle(b) {
  return { ...b, chatIds: [...new Set(Array.isArray(b.chatIds) ? b.chatIds : [])] };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_BUNDLE': {
      if (!state.memoryOn) return state; // J-7: disabled control
      if (state.bundleOn) {
        // G5 / J-6: off means off — instantly, no dialog, no residue.
        return {
          ...state,
          bundleOn: false,
          phase: 'off',
          renaming: null,
          journeys: state.everFormed ? mark(state, 'J6') : state.journeys,
        };
      }
      // Turning on. If bundles already formed once, resume — corrections kept (J-6).
      // In the live engine, on re-runs Form and merges again (B6 rule 6); the merge
      // is what keeps the corrections, and the Merge stage shows what it overrode.
      if (state.everFormed && !state.failNext && state.engine !== 'live') {
        return { ...state, bundleOn: true, phase: 'ready' };
      }
      return { ...state, bundleOn: true, phase: 'generating', runId: state.runId + 1 };
    }

    case 'GENERATION_DONE': { // simulated path — the provider only fires it when engine !== 'live'
      if (state.phase !== 'generating' || action.runId !== state.runId) return state;
      // INV-4, belt and braces: no run resolves while memory is off. Unreachable by
      // construction (TOGGLE_MEMORY re-routes 'generating' → 'paused', and the resume
      // path restarts the run with a fresh runId) — which is why it is worth asserting.
      if (!state.memoryOn) return state;
      if (state.failNext) return { ...state, phase: 'failed', failNext: false };
      if (state.scenario === 'fresh') return { ...state, phase: 'thin' };
      return { ...state, phase: 'ready', everFormed: true, journeys: mark(state, 'J1') };
    }

    case 'BUNDLES_FORMED': { // live path — the engine's Form + merge result
      if (state.phase !== 'generating' || action.runId !== state.runId) return state;
      if (!state.memoryOn) return state; // INV-4
      if (state.failNext) return { ...state, phase: 'failed', failNext: false }; // demo "fail next" still works live
      const bundles = (action.bundles || []).filter((b) => b && b.id != null).map(normaliseBundle);
      const formed = anyVisibleChat(state, bundles);
      return {
        ...state,
        bundles,
        rejected: action.rejected || [],
        overrides: action.overrides || [],
        phase: formed ? 'ready' : 'thin',
        everFormed: true,
        journeys: formed ? mark(state, 'J1') : state.journeys,
      };
    }

    case 'GENERATION_FAILED': { // live path — §9 COULDN'T BUNDLE, list untouched (D9)
      if (state.phase !== 'generating' || action.runId !== state.runId) return state;
      return { ...state, phase: 'failed', failNext: false };
    }

    case 'BUNDLE_ATTACHED': { // B6 rule 4 — adds one chat to one bundle; renames nothing, moves nothing else
      const { chatId, bundleId = null, runnerUp = null, reason = '' } = action;
      const lastAttach = { chatId, bundleId, runnerUp, reason };
      const target = bundleId != null && state.bundles ? state.bundles.find((b) => b.id === bundleId) : null;
      const joins = Boolean(target) && !state.hidden[bundleId] && !target.chatIds.includes(chatId);
      const bundles = joins
        ? state.bundles.map((b) => (b.id === bundleId ? { ...b, chatIds: [...b.chatIds, chatId] } : b))
        : state.bundles;
      return {
        ...state,
        bundles,
        lastAttach,
        highlightId: chatId,
        journeys: joins && state.phase === 'ready' ? mark(state, 'J2') : state.journeys,
      };
    }

    case 'CHAT_CARDED': { // a live chat gets its title + summary from Claude (D1)
      if (!state.liveChats.some((c) => c.id === action.chatId)) return state;
      return {
        ...state,
        liveChats: state.liveChats.map((c) =>
          c.id === action.chatId
            ? { ...c, title: action.title ?? c.title, summary: action.summary ?? c.summary }
            : c),
      };
    }

    case 'SET_ENGINE':
      return action.mode === state.engine ? state : { ...state, engine: action.mode === 'live' ? 'live' : 'sim' };

    case 'RETRY': // §9 COULDN'T BUNDLE — retry is one tap (A12)
      if (!state.memoryOn) return state; // INV-4: Bundle never runs where memory does not
      return { ...state, phase: 'generating', runId: state.runId + 1 };

    case 'TOGGLE_MEMORY': {
      if (state.memoryOn) {
        // J-7: turning memory off pauses Bundle the same moment.
        const paused = state.bundleOn && state.phase !== 'off';
        return {
          ...state,
          memoryOn: false,
          pausedFrom: paused ? state.phase : null,
          phase: paused ? 'paused' : state.phase,
          renaming: null,
          journeys: mark(state, 'J7'),
        };
      }
      // Memory returns → Bundle resumes where it paused (J-7: "until memory returns").
      if (state.phase === 'paused') {
        const back = state.pausedFrom === 'generating' ? 'generating' : state.pausedFrom || 'ready';
        return {
          ...state,
          memoryOn: true,
          pausedFrom: null,
          phase: back,
          runId: back === 'generating' ? state.runId + 1 : state.runId,
        };
      }
      return { ...state, memoryOn: true };
    }

    case 'START_RENAME':
      return { ...state, renaming: action.key };

    case 'COMMIT_RENAME': {
      const name = (action.name || '').trim();
      if (!name) return { ...state, renaming: null };
      return {
        ...state,
        renaming: null,
        names: { ...state.names, [action.key]: name }, // INV-3: a renamed bundle is settled
        journeys: mark(state, 'J3'),
      };
    }

    case 'CANCEL_RENAME':
      return { ...state, renaming: null };

    case 'REMOVE_FROM_BUNDLE': // J-4
      return {
        ...state,
        removed: { ...state.removed, [action.chatId]: true },
        toast: { id: Date.now(), text: 'Removed from bundle.', undo: { type: 'UNDO_REMOVE', chatId: action.chatId } },
        journeys: mark(state, 'J4'),
      };

    case 'UNDO_REMOVE': {
      const removed = { ...state.removed };
      delete removed[action.chatId];
      return { ...state, removed, toast: null };
    }

    case 'HIDE_BUNDLE': // J-5 — confirmed in the dialog before this dispatch
      return {
        ...state,
        hidden: { ...state.hidden, [action.key]: true },
        toast: { id: Date.now(), text: 'Bundle hidden.', undo: { type: 'UNDO_HIDE', key: action.key } },
        journeys: mark(state, 'J5'),
      };

    case 'UNDO_HIDE': {
      const hidden = { ...state.hidden };
      delete hidden[action.key];
      return { ...state, hidden, toast: null };
    }

    case 'TOGGLE_COLLAPSE':
      return { ...state, collapsed: { ...state.collapsed, [action.key]: !state.collapsed[action.key] } };

    case 'NEW_CHAT': { // J-2
      if (state.arrivals.length >= INCOMING_CHATS.length) return state;
      const chat = INCOMING_CHATS[state.arrivals.length];
      // In the sim path the fixture concern places the chat; in the live path only
      // BUNDLE_ATTACHED does, and it is the one that marks J2.
      const joins =
        state.bundles === null && state.phase === 'ready' && chat.concern && !state.hidden[chat.concern];
      return {
        ...state,
        arrivals: [...state.arrivals, chat.id],
        highlightId: chat.id,
        journeys: joins ? mark(state, 'J2') : state.journeys,
      };
    }

    case 'CHAT_CREATED': { // v0.2 beat 1 — a real chat, carded by Claude
      const chat = action.chat;
      if (state.liveChats.some((c) => c.id === chat.id)) return state;
      const joins =
        state.bundles === null && state.phase === 'ready' && chat.concern && !state.hidden[chat.concern];
      return {
        ...state,
        liveChats: [chat, ...state.liveChats],
        highlightId: chat.id,
        journeys: joins ? mark(state, 'J2') : state.journeys,
      };
    }

    case 'CLEAR_HIGHLIGHT':
      return state.highlightId === action.id ? { ...state, highlightId: null } : state;

    case 'DELETE_CHAT': // A14 — exactly as today; bundles cannot delete, Delete still can.
      return { ...state, deleted: { ...state.deleted, [action.chatId]: true } };

    case 'SET_FAIL_NEXT':
      return { ...state, failNext: action.value };

    case 'SET_SCENARIO': {
      if (action.scenario === state.scenario) return state;
      const next = hydrateState(action.scenario);
      return { ...next, journeys: state.journeys, engine: state.engine }; // walked journeys + engine mode survive scenario swaps
    }

    case 'DISMISS_NOTE':
      return { ...state, noteDismissed: true };

    case 'TOAST':
      return { ...state, toast: { id: Date.now(), text: action.text, undo: null } };

    case 'CLEAR_TOAST':
      return state.toast?.id === action.id ? { ...state, toast: null } : state;

    case 'RESET': // the provider removes the persisted corrections for this scenario
      return { ...freshState(state.scenario), engine: state.engine };

    default:
      return state;
  }
}

/* ── Persistence (D7) ────────────────────────────────────────────────
   Only the four corrections are stored — names, removed, hidden, collapsed — under
   `bundle:corrections:<scenario>`. Never the key, never chats, never bundles.
   Every localStorage access is guarded: the SSR smoke runs in Node.                */

export const correctionsKey = (scenario) => `bundle:corrections:${scenario}`;

const storage = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// The four corrections as a plain blob (what gets written).
export function serializeCorrections(state) {
  return { names: state.names, removed: state.removed, hidden: state.hidden, collapsed: state.collapsed };
}

// Fresh defaults ⇒ nothing worth keeping (RESET, or every correction undone).
export function isDefaultCorrections(state) {
  const fresh = freshState(state.scenario);
  const empty = (o) => Object.keys(o || {}).length === 0;
  const sameCollapsed =
    JSON.stringify(Object.entries(state.collapsed || {}).filter(([, v]) => v).sort()) ===
    JSON.stringify(Object.entries(fresh.collapsed).filter(([, v]) => v).sort());
  return empty(state.names) && empty(state.removed) && empty(state.hidden) && sameCollapsed;
}

// Merge a stored blob into a state (pure). Unknown or malformed fields are ignored.
export function applyCorrections(state, blob) {
  if (!isPlainObject(blob)) return state;
  const pick = (field) => (isPlainObject(blob[field]) ? { ...state[field], ...blob[field] } : state[field]);
  return { ...state, names: pick('names'), removed: pick('removed'), hidden: pick('hidden'), collapsed: pick('collapsed') };
}

export function loadCorrections(scenario) {
  const ls = storage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(correctionsKey(scenario));
    if (!raw) return null;
    const blob = JSON.parse(raw);
    return isPlainObject(blob) ? blob : null;
  } catch {
    return null;
  }
}

export function saveCorrections(scenario, state) {
  const ls = storage();
  if (!ls) return;
  try {
    if (isDefaultCorrections(state)) ls.removeItem(correctionsKey(scenario));
    else ls.setItem(correctionsKey(scenario), JSON.stringify(serializeCorrections(state)));
  } catch {
    /* quota / private mode — corrections still live in memory for this session */
  }
}

export function clearCorrections(scenario) {
  const ls = storage();
  if (!ls) return;
  try {
    ls.removeItem(correctionsKey(scenario));
  } catch {
    /* ignore */
  }
}

// Fresh state for a scenario with that scenario's stored corrections merged in.
export function hydrateState(scenario = 'meera') {
  return applyCorrections(freshState(scenario), loadCorrections(scenario));
}

const Ctx = createContext(null);

export function BundleProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => hydrateState('meera'));
  const stateRef = useRef(state);
  stateRef.current = state;

  // Generation timer — §9 GENERATING never blocks the list; it just takes a moment.
  // Simulated path only: in 'live' the pipeline resolves the run (BUNDLES_FORMED /
  // GENERATION_FAILED), so the timer must not race it.
  useEffect(() => {
    if (state.phase !== 'generating' || state.engine === 'live') return;
    const runId = state.runId;
    const ms = state.scenario === 'fresh' ? 1100 : 2200;
    const t = setTimeout(() => dispatch({ type: 'GENERATION_DONE', runId }), ms);
    return () => clearTimeout(t);
  }, [state.phase, state.runId, state.scenario, state.engine]);

  // Corrections persist across reloads (D7). Written on every change of the four;
  // when they are back at the defaults (RESET) the key is removed.
  const { scenario, names, removed, hidden, collapsed } = state;
  useEffect(() => {
    saveCorrections(scenario, { scenario, names, removed, hidden, collapsed });
  }, [scenario, names, removed, hidden, collapsed]);

  // Toasts auto-dismiss; Undo stays available while visible (§9.1).
  useEffect(() => {
    if (!state.toast) return;
    const id = state.toast.id;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_TOAST', id }), 6000);
    return () => clearTimeout(t);
  }, [state.toast]);

  // A joined chat glows briefly, then is ordinary (J-2).
  useEffect(() => {
    if (!state.highlightId) return;
    const id = state.highlightId;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_HIGHLIGHT', id }), 2600);
    return () => clearTimeout(t);
  }, [state.highlightId]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBundle() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBundle outside BundleProvider');
  return ctx;
}

/* ── Derived index ───────────────────────────────────────────────────
   One derivation feeds both surfaces, so the sidebar and the Chats and
   tasks page can never disagree (A13).                                */

/* §7.2 · INV-4 · A5 — who may be bundled, stated as a rule and named.
   "Chats inside Projects are never candidates: they are already grouped, by the
   person, which outranks any inference. Incognito chats are never candidates:
   they sit outside memory, and Bundle sees only what memory sees."
   Incognito chats never reach this index at all — outside memory is outside the
   prototype's data — but the disqualification lives here regardless, so that a
   chat property added later cannot flow into a bundle by default. */
export function isBundleCandidate(chat) {
  if (chat.project) return false; // already the person's grouping; it outranks inference
  if (chat.incognito) return false; // outside memory, therefore outside Bundle
  return true;
}

// The bundle shape both surfaces consume (Rows.jsx reads key / name / chats / collapsed).
function viewBundle(state, key, defaultName, chats, extra = {}) {
  return {
    key,
    id: key,
    name: state.names[key] || defaultName, // INV-3
    renamed: Boolean(state.names[key]),
    chats,
    collapsed: Boolean(state.collapsed[key]),
    latest: chats[0]?.date || '0000',
    ...extra,
  };
}

export function selectIndex(state) {
  const base = state.scenario === 'meera' ? MEERA_CHATS : FRESH_CHATS;
  const arrivals = INCOMING_CHATS.filter((ch) => state.arrivals.includes(ch.id));
  const live = state.scenario === 'meera' ? state.liveChats || [] : [];
  const all = [...live, ...arrivals, ...base].filter((ch) => !state.deleted[ch.id]);

  const nonProject = all.filter((ch) => !ch.project).sort(byNewest);

  // Project sections are derived from the chats themselves, which is what makes the
  // derivation total: every chat lands in exactly one of bundles / listChats / projects.
  // A hardcoded list of project names cannot place a chat in a project it does not know
  // about, and such a chat rendered nowhere — losing a chat is INV-2's named failure,
  // and it counts whether a bundle action did it or the derivation did.
  const projects = [...new Set(all.filter((ch) => ch.project).map((ch) => ch.project))]
    .map((name) => ({ name, chats: all.filter((ch) => ch.project === name).sort(byNewest) }));

  // Bundle membership is built from the candidacy rule above — never from nonProject,
  // whose exclusion of project chats is a side effect of assembling the list. Candidates
  // are a subset of nonProject, so the listChats subtraction below stays exact (INV-1).
  const candidates = all.filter(isBundleCandidate).sort(byNewest);

  // INV-4 — the derivation tests memory itself rather than trusting phase to encode it.
  const showBundles = state.phase === 'ready' && state.memoryOn;

  let bundles = [];
  if (showBundles && state.bundles) {
    // Engine path: membership is the bundle's chatIds, filtered through the same
    // candidacy rule (INV-4) and the person's corrections. A chat claimed by two
    // bundles goes to the first that lists it, so the derivation stays a partition.
    const claimed = new Set();
    bundles = state.bundles
      .filter((b) => !state.hidden[b.id])
      .map((b) => {
        const members = new Set(b.chatIds);
        const chats = candidates.filter((ch) => {
          if (!members.has(ch.id) || state.removed[ch.id] || claimed.has(ch.id)) return false;
          claimed.add(ch.id);
          return true;
        });
        return viewBundle(state, b.id, b.name, chats, {
          nameSource: state.names[b.id] ? 'person' : b.nameSource || 'model',
          domain: b.domain ?? null,
          language: b.language ?? null,
          sensitive: Boolean(b.sensitive),
          concern: b.concern ?? '',
        });
      })
      .filter((b) => b.chats.length > 0) // an emptied bundle simply isn't there
      .sort((a, b) => byNewest({ date: a.latest }, { date: b.latest })); // §11: boring order
  } else if (showBundles) {
    // Simulated path (v0.1): the fixtures' concern hint stands in for the engine.
    bundles = Object.values(CONCERNS)
      .filter((def) => !state.hidden[def.key])
      .map((def) => {
        const chats = candidates.filter((ch) => ch.concern === def.key && !state.removed[ch.id]);
        return viewBundle(state, def.key, def.defaultName, chats, { nameSource: state.names[def.key] ? 'person' : 'model' });
      })
      .filter((b) => b.chats.length > 0) // an emptied bundle simply isn't there
      .sort((a, b) => byNewest({ date: a.latest }, { date: b.latest })); // §11: boring order
  }

  const bundledIds = new Set(bundles.flatMap((b) => b.chats.map((ch) => ch.id)));

  // Fig. 3 / Fig. 7 — "everything else stays exactly where it was, under All chats".
  // Removed chats and hidden bundles' chats are back in the list (J-4, J-5).
  const listChats = showBundles ? nonProject.filter((ch) => !bundledIds.has(ch.id)) : nonProject;

  return { projects, bundles, listChats, showBundles, chatCount: nonProject.length };
}
