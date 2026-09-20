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
  off→on and across memory pauses — §11, Q2, J-6 ("resumes rather than restarts").
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
  names: {}, // concernKey -> person's name (INV-3: never overwritten)
  removed: {}, // chatId -> true (J-4: a removal is remembered)
  hidden: {}, // concernKey -> true (J-5/R3: stays hidden)
  collapsed: { apartment: true, spanish: true }, // chevron state persists per bundle (Fig. 4)
  deleted: {}, // chatId -> true (A14: delete behaves exactly as today)
  arrivals: [], // simulated incoming chats (J-2)
  liveChats: [], // real chats created in the demo, carded by Claude (v0.2 beat 1)
  failNext: false,
  highlightId: null, // freshly-joined chat, briefly marked
  toast: null, // { id, text, undo: {type, payload} | null }
  renaming: null, // concernKey during inline rename
  journeys: {},
  runId: 0, // increments per generation run (timer identity)
});

function mark(state, j) {
  if (state.journeys[j]) return state.journeys;
  return { ...state.journeys, [j]: true };
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
      if (state.everFormed && !state.failNext) {
        return { ...state, bundleOn: true, phase: 'ready' };
      }
      return { ...state, bundleOn: true, phase: 'generating', runId: state.runId + 1 };
    }

    case 'GENERATION_DONE': {
      if (state.phase !== 'generating' || action.runId !== state.runId) return state;
      // INV-4, belt and braces: no run resolves while memory is off. Unreachable by
      // construction (TOGGLE_MEMORY re-routes 'generating' → 'paused', and the resume
      // path restarts the run with a fresh runId) — which is why it is worth asserting.
      if (!state.memoryOn) return state;
      if (state.failNext) return { ...state, phase: 'failed', failNext: false };
      if (state.scenario === 'fresh') return { ...state, phase: 'thin' };
      return { ...state, phase: 'ready', everFormed: true, journeys: mark(state, 'J1') };
    }

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
      const joins =
        state.phase === 'ready' && chat.concern && !state.hidden[chat.concern];
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
      const joins = state.phase === 'ready' && chat.concern && !state.hidden[chat.concern];
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
      const next = freshState(action.scenario);
      return { ...next, journeys: state.journeys }; // walked journeys survive scenario swaps
    }

    case 'DISMISS_NOTE':
      return { ...state, noteDismissed: true };

    case 'TOAST':
      return { ...state, toast: { id: Date.now(), text: action.text, undo: null } };

    case 'CLEAR_TOAST':
      return state.toast?.id === action.id ? { ...state, toast: null } : state;

    case 'RESET':
      return freshState(state.scenario);

    default:
      return state;
  }
}

const Ctx = createContext(null);

export function BundleProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => freshState());
  const stateRef = useRef(state);
  stateRef.current = state;

  // Generation timer — §9 GENERATING never blocks the list; it just takes a moment.
  useEffect(() => {
    if (state.phase !== 'generating') return;
    const runId = state.runId;
    const ms = state.scenario === 'fresh' ? 1100 : 2200;
    const t = setTimeout(() => dispatch({ type: 'GENERATION_DONE', runId }), ms);
    return () => clearTimeout(t);
  }, [state.phase, state.runId, state.scenario]);

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
  if (showBundles) {
    bundles = Object.values(CONCERNS)
      .filter((def) => !state.hidden[def.key])
      .map((def) => {
        const chats = candidates.filter((ch) => ch.concern === def.key && !state.removed[ch.id]);
        return {
          key: def.key,
          name: state.names[def.key] || def.defaultName, // INV-3
          renamed: Boolean(state.names[def.key]),
          chats,
          collapsed: Boolean(state.collapsed[def.key]),
          latest: chats[0]?.date || '0000',
        };
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
