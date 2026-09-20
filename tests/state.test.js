// Ported from scripts/statetest.js (every assertion, same descriptions), then the
// v0.2 additions: D3 (partition with engine bundles), D6 (attach never renames or
// moves), D7 (corrections survive off→on with a re-formed run, and a reload),
// D11 (merge keeps ids and names on a second identical run).
//
// Counts are derived from the fixtures so the file stays true whether the demo life
// has 36 or 40 chats. The port keeps the script's sequential style: state is walked
// at collection time and each `assert` registers one named test.
import { describe, it, expect } from 'vitest';
import {
  reducer, freshState, selectIndex, isBundleCandidate,
  applyCorrections, serializeCorrections, isDefaultCorrections, hydrateState, correctionsKey,
} from '../src/state/store';
import { mergeBundles, overlapScore, majorityConcern } from '../src/engine/merge';
import { MEERA_CHATS, FRESH_CHATS, INCOMING_CHATS, CONCERNS, sortKey } from '../src/data/chats';

const NON_PROJECT = MEERA_CHATS.filter((c) => !c.project).length; // 38 with the 40-chat life
const PROJECT = MEERA_CHATS.filter((c) => c.project).length;
const byConcern = (key) => MEERA_CHATS.filter((c) => c.concern === key).length;
const BUNDLED = Object.keys(CONCERNS).reduce((n, k) => n + byConcern(k), 0);
const UNGROUPED = NON_PROJECT - BUNDLED;
const HAS_HEALTH = Boolean(CONCERNS.health);

let s = freshState();
const d = (a) => { s = reducer(s, a); };
let asserts = [];
const assert = (cond, msg) => asserts.push([Boolean(cond), msg]);
const flush = (title) => {
  const list = asserts;
  asserts = [];
  describe(title, () => {
    for (const [ok, msg] of list) it(msg, () => { expect(ok, msg).toBe(true); });
  });
};

/* ── the v0.1 script, verbatim in intent ─────────────────────────── */

// baseline: off = today, byte for byte (A1)
let ix = selectIndex(s);
assert(ix.listChats.length === NON_PROJECT && ix.bundles.length === 0 && !ix.showBundles, `A1 off: flat list of ${NON_PROJECT}, no bundles`);
assert(ix.projects[0].chats.length === PROJECT, 'project section intact');

// J-1
d({ type: 'TOGGLE_BUNDLE' });
assert(s.phase === 'generating', 'J-1 generating');
ix = selectIndex(s);
assert(ix.listChats.length === NON_PROJECT, 'INV-1: list untouched during generation');
d({ type: 'GENERATION_DONE', runId: s.runId });
assert(s.phase === 'ready' && s.journeys.J1, 'J-1 ready');
ix = selectIndex(s);
const counts = Object.fromEntries(ix.bundles.map((b) => [b.key, b.chats.length]));
assert(
  counts.retirement === 9 && counts.apartment === 5 && counts.spanish === 12 && (!HAS_HEALTH || counts.health === 4),
  `formation counts 9/5/12${HAS_HEALTH ? '/4' : ''}`,
);
assert(ix.listChats.length === UNGROUPED, `All chats = the ${UNGROUPED} ungrouped (Fig. 3)`);
assert(ix.bundles[0].key === 'retirement', 'bundles sort by most recent activity (§11)');

// J-2
d({ type: 'NEW_CHAT' });
ix = selectIndex(s);
assert(ix.bundles.find((b) => b.key === 'retirement').chats.length === 10 && s.journeys.J2, 'J-2 joins: 9→10, name intact');
assert(ix.bundles.find((b) => b.key === 'retirement').name === 'Retirement planning', 'J-2 name unchanged (A10)');

// J-3
d({ type: 'START_RENAME', key: 'apartment' });
d({ type: 'COMMIT_RENAME', key: 'apartment', name: "Anaya's flat" });
ix = selectIndex(s);
assert(ix.bundles.find((b) => b.key === 'apartment').name === "Anaya's flat" && s.journeys.J3, 'J-3 renamed');

// J-4 + undo + re-remove
d({ type: 'REMOVE_FROM_BUNDLE', chatId: 'r4' });
ix = selectIndex(s);
assert(ix.listChats.some((c) => c.id === 'r4') && s.toast.text === 'Removed from bundle.' && s.journeys.J4, 'J-4 removed → back in All chats + toast');
d({ type: 'UNDO_REMOVE', chatId: 'r4' });
assert(!selectIndex(s).listChats.some((c) => c.id === 'r4'), 'J-4 undo restores membership');
d({ type: 'REMOVE_FROM_BUNDLE', chatId: 'r4' });

// J-5
d({ type: 'HIDE_BUNDLE', key: 'spanish' });
ix = selectIndex(s);
assert(!ix.bundles.some((b) => b.key === 'spanish') && s.journeys.J5, 'J-5 hidden bundle gone');
assert(ix.listChats.some((c) => c.id === 's1'), 'J-5 its chats visible chronologically');

// J-6 off means off, on resumes
d({ type: 'TOGGLE_BUNDLE' });
assert(s.phase === 'off' && s.journeys.J6, 'J-6 off instantly');
ix = selectIndex(s);
assert(ix.listChats.length === NON_PROJECT + 1 && ix.bundles.length === 0, `off restores flat list (${NON_PROJECT} + 1 arrival)`);
d({ type: 'TOGGLE_BUNDLE' });
assert(s.phase === 'ready', 'J-6 back on resumes without regeneration');
ix = selectIndex(s);
assert(ix.bundles.find((b) => b.key === 'apartment').name === "Anaya's flat", 'Q2 rename survives');
assert(!ix.bundles.some((b) => b.key === 'spanish'), 'Q2 hide survives');
assert(ix.listChats.some((c) => c.id === 'r4'), 'Q2 removal survives');

// J-7 memory pause + resume
d({ type: 'TOGGLE_MEMORY' });
assert(s.phase === 'paused' && !s.memoryOn && s.journeys.J7, 'J-7 memory off pauses');
assert(!selectIndex(s).showBundles, 'J-7 flat list while paused');
d({ type: 'TOGGLE_MEMORY' });
assert(s.phase === 'ready', 'J-7 memory back → bundles return');

// failure path (A12)
d({ type: 'SET_FAIL_NEXT', value: true });
d({ type: 'TOGGLE_BUNDLE' });
d({ type: 'TOGGLE_BUNDLE' });
assert(s.phase === 'generating', 'fail-next forces regeneration');
d({ type: 'GENERATION_DONE', runId: s.runId });
assert(s.phase === 'failed', 'A12 failed state');
assert(selectIndex(s).listChats.length === NON_PROJECT + 1, 'A12 index untouched on failure');
d({ type: 'RETRY' });
d({ type: 'GENERATION_DONE', runId: s.runId });
assert(s.phase === 'ready', 'A12 retry succeeds');

// A14 delete
d({ type: 'DELETE_CHAT', chatId: 'r1' });
ix = selectIndex(s);
assert(!ix.bundles.find((b) => b.key === 'retirement').chats.some((c) => c.id === 'r1'), 'A14 delete removes from bundle view');
assert(!ix.listChats.some((c) => c.id === 'r1'), 'A14 delete removes from list');

// thin history
d({ type: 'SET_SCENARIO', scenario: 'fresh' });
assert(s.journeys.J1, 'journeys survive scenario swap');
d({ type: 'TOGGLE_BUNDLE' });
d({ type: 'GENERATION_DONE', runId: s.runId });
assert(s.phase === 'thin', 'fresh account → too little history');
assert(selectIndex(s).listChats.length === FRESH_CHATS.length, `thin: ${FRESH_CHATS.length} chats, untouched`);
flush('journeys J-1..J-7 + acceptance (ported)');

// A5 — no bundle ever contains a Project chat or an incognito chat (INV-4 · §7.2).
s = freshState();
d({ type: 'TOGGLE_BUNDLE' });
d({ type: 'GENERATION_DONE', runId: s.runId });
ix = selectIndex(s);
const bundled = ix.bundles.flatMap((b) => b.chats);
assert(bundled.length === BUNDLED, `A5 precondition: bundles formed (${BUNDLED})`);
assert(ix.projects[0].chats.length === PROJECT, 'A5 precondition: project chats exist to be excluded');
assert(!bundled.some((c) => c.project), 'A5 no bundle contains a Project chat');
assert(!bundled.some((c) => c.incognito), 'A5 no bundle contains an incognito chat');
assert(!isBundleCandidate({ id: 'z1', concern: 'retirement', project: 'bookclub/notes' }), 'A5 candidacy rejects a project chat');
assert(!isBundleCandidate({ id: 'z2', concern: 'retirement', incognito: true }), 'A5 candidacy rejects an incognito chat');
assert(isBundleCandidate({ id: 'z3', concern: 'retirement' }), 'A5 candidacy admits an ordinary chat');
flush('A5 candidacy (ported)');

// §11 — order is boring on purpose.
const descending = (keys) => keys.every((k, i) => i === 0 || keys[i - 1] >= k);
s = freshState();
d({ type: 'TOGGLE_BUNDLE' });
d({ type: 'GENERATION_DONE', runId: s.runId });
d({ type: 'NEW_CHAT' }); // n1 · retirement · "today"
d({ type: 'NEW_CHAT' }); // n2 · spanish · "today"
ix = selectIndex(s);
assert(descending(ix.bundles.map((b) => sortKey(b.chats[0].date))), '§11 bundles ordered by most recent activity');
for (const b of ix.bundles) {
  assert(descending(b.chats.map((ch) => sortKey(ch.date))), `§11 rows newest-first inside ${b.key}`);
}
assert(ix.bundles[0].chats[0].id === 'n1', '§11 newest chat leads its bundle');
assert(descending(ix.listChats.map((ch) => sortKey(ch.date))), '§11 All chats stays newest-first');
flush('§11 order (ported)');

// The derivation is total: no chat is lost or duplicated across the three outputs.
const partition = (state, label) => {
  const base = state.scenario === 'meera' ? MEERA_CHATS : FRESH_CHATS;
  const live = state.scenario === 'meera' ? state.liveChats : [];
  const expected = [...live, ...INCOMING_CHATS.filter((ch) => state.arrivals.includes(ch.id)), ...base]
    .filter((ch) => !state.deleted[ch.id])
    .map((ch) => ch.id);
  const i = selectIndex(state);
  const seen = [
    ...i.bundles.flatMap((b) => b.chats.map((ch) => ch.id)),
    ...i.listChats.map((ch) => ch.id),
    ...i.projects.flatMap((p) => p.chats.map((ch) => ch.id)),
  ];
  assert(new Set(seen).size === seen.length, `${label}: no chat appears twice`);
  assert(seen.length === expected.length, `${label}: ${seen.length} visible = ${expected.length} in data`);
  assert(expected.every((id) => seen.includes(id)), `${label}: every chat appears somewhere`);
};

partition(freshState(), 'partition · off');
partition(s, 'partition · ready + arrivals');
d({ type: 'COMMIT_RENAME', key: 'apartment', name: "Anaya's flat" });
d({ type: 'REMOVE_FROM_BUNDLE', chatId: 'r4' });
d({ type: 'HIDE_BUNDLE', key: 'spanish' });
d({ type: 'DELETE_CHAT', chatId: 'u1' });
partition(s, 'partition · after corrections');
s = freshState('fresh');
d({ type: 'TOGGLE_BUNDLE' });
d({ type: 'GENERATION_DONE', runId: s.runId });
partition(s, 'partition · fresh account');

// A chat in a project the derivation was never told about used to render nowhere.
MEERA_CHATS.push({ id: 'x1', title: 'Recipe experiments', date: '2026-06-20', concern: null, project: 'kitchen/notes' });
s = freshState();
d({ type: 'TOGGLE_BUNDLE' });
d({ type: 'GENERATION_DONE', runId: s.runId });
ix = selectIndex(s);
const kitchen = ix.projects.find((p) => p.name === 'kitchen/notes');
assert(kitchen && kitchen.chats.some((ch) => ch.id === 'x1'), 'a second project gets its own section');
assert(ix.projects.some((p) => p.name === 'bookclub/notes'), 'the original project section survives');
assert(!ix.bundles.flatMap((b) => b.chats).some((ch) => ch.id === 'x1'), 'A5 the injected project chat still never bundles');
partition(s, 'partition · unknown project');
MEERA_CHATS.pop();
flush('partition — the derivation is total (ported)');

// INV-4 regression — the fail → memory-off → RETRY → GENERATION_DONE path.
s = freshState();
d({ type: 'SET_FAIL_NEXT', value: true });
d({ type: 'TOGGLE_BUNDLE' });
d({ type: 'GENERATION_DONE', runId: s.runId });
assert(s.phase === 'failed', 'INV-4 regression setup: failed state reached');
d({ type: 'TOGGLE_MEMORY' });
assert(!s.memoryOn && s.phase === 'paused', 'INV-4 regression setup: memory off pauses');
d({ type: 'RETRY' });
assert(s.phase === 'paused', 'INV-4 RETRY is inert while memory is off');
d({ type: 'GENERATION_DONE', runId: s.runId });
assert(s.phase !== 'ready', 'INV-4 no path resolves to ready with memory off');
assert(!selectIndex(s).showBundles, 'INV-4 no bundles render with memory off');
assert(!selectIndex({ ...s, phase: 'ready', memoryOn: false }).showBundles,
  'INV-4 selectIndex refuses bundles with memory off, whatever phase claims');
flush('INV-4 regression (ported)');

/* ── v0.2 additions ──────────────────────────────────────────────── */

const ids = (key) => MEERA_CHATS.filter((c) => c.concern === key).map((c) => c.id);
const B = (id, name, chatIds, extra = {}) => ({
  id, name, nameSource: 'model', domain: name, language: 'en', sensitive: false, concern: `${name} — ongoing`, chatIds, ...extra,
});
const handMade = () => [
  B('retirement', 'Retirement planning', ids('retirement')),
  B('apartment', 'Apartment hunt', ids('apartment')),
  B('spanish', 'Spanish practice', ids('spanish')),
  ...(HAS_HEALTH ? [B('health', 'Health', ids('health'), { sensitive: true })] : []),
];
const formLive = (bundles, extra = {}) => {
  d({ type: 'BUNDLES_FORMED', runId: s.runId, bundles, rejected: [], overrides: [], ...extra });
};

// D3 — partition with engine bundles, including a hidden one, one with a removed
// chat, one claiming a project chat, a duplicate claim and an unknown id.
s = freshState();
d({ type: 'SET_ENGINE', mode: 'live' });
d({ type: 'HIDE_BUNDLE', key: 'spanish' });
d({ type: 'REMOVE_FROM_BUNDLE', chatId: 'r4' });
d({ type: 'TOGGLE_BUNDLE' });
assert(s.phase === 'generating' && s.bundles === null, 'D3 live toggle-on enters generating with bundles still null');
assert(selectIndex(s).bundles.length === 0 && selectIndex(s).listChats.length === NON_PROJECT, 'D3 INV-1 list untouched while the engine runs');
formLive([
  ...handMade(),
  B('b_c9', 'Reading group', ['p1', 'u2', 'r2', 'ghost']), // p1 is a project chat, r2 is already retirement's, ghost does not exist
]);
assert(s.phase === 'ready' && s.everFormed && s.journeys.J1, 'D3 BUNDLES_FORMED → ready, everFormed, J1');
ix = selectIndex(s);
assert(!ix.bundles.some((b) => b.key === 'spanish'), 'D3 hidden bundle stays hidden through an engine run');
assert(ix.listChats.some((c) => c.id === 's1'), 'D3 hidden bundle\'s chats are in All chats');
assert(ix.listChats.some((c) => c.id === 'r4') && !ix.bundles.find((b) => b.key === 'retirement').chats.some((c) => c.id === 'r4'), 'D3 removed chat is in All chats, not its bundle');
assert(!ix.bundles.flatMap((b) => b.chats).some((c) => c.id === 'p1'), 'D3 INV-4 a project chat claimed by the engine still never bundles');
assert(ix.projects[0].chats.some((c) => c.id === 'p1'), 'D3 the project chat is still in its project');
assert(ix.bundles.find((b) => b.key === 'retirement').chats.some((c) => c.id === 'r2') && !ix.bundles.find((b) => b.key === 'b_c9').chats.some((c) => c.id === 'r2'), 'D3 a chat claimed twice renders once, in the first bundle');
assert(ix.bundles.find((b) => b.key === 'b_c9').chats.map((c) => c.id).join() === 'u2', 'D3 the unknown id is ignored');
partition(s, 'D3 partition · engine bundles');
const view = ix.bundles[0];
assert(['key', 'id', 'name', 'renamed', 'chats', 'collapsed', 'latest', 'nameSource', 'domain', 'language', 'sensitive', 'concern'].every((f) => f in view), 'D3 view bundle carries the fields both surfaces read');
assert(ix.bundles.find((b) => b.key === 'apartment').collapsed === true && ix.bundles.find((b) => b.key === 'retirement').collapsed === false, 'D3 collapse defaults apply to engine ids');
if (HAS_HEALTH) assert(ix.bundles.find((b) => b.key === 'health').sensitive === true, 'D3 sensitive flag is passed through');
d({ type: 'NEW_CHAT' }); // n1 arrives; in the live path it is not placed until attached
ix = selectIndex(s);
assert(ix.listChats.some((c) => c.id === 'n1') && !s.journeys.J2, 'D3 live: an arrival waits in All chats until BUNDLE_ATTACHED');
partition(s, 'D3 partition · engine bundles + arrival');
d({ type: 'CHAT_CREATED', chat: { id: 'live-1', title: 'Untitled', summary: '', date: 'today', concern: null, project: null, source: 'new' } });
d({ type: 'CHAT_CARDED', chatId: 'live-1', title: 'SCSS vs tax-saver FD', summary: 'Compared quarterly SCSS interest with a 5-year FD.' });
assert(s.liveChats[0].title === 'SCSS vs tax-saver FD' && s.liveChats[0].summary.startsWith('Compared'), 'CHAT_CARDED updates the live chat\'s title and summary');
assert(reducer(s, { type: 'CHAT_CARDED', chatId: 'nope', title: 'x', summary: 'y' }) === s, 'CHAT_CARDED ignores an unknown chat');
partition(s, 'D3 partition · engine bundles + live chat');
// stale / out-of-phase runs are ignored
const before = s;
d({ type: 'BUNDLES_FORMED', runId: s.runId, bundles: [], rejected: [], overrides: [] });
assert(s === before, 'BUNDLES_FORMED is ignored outside generating');
d({ type: 'TOGGLE_BUNDLE' }); d({ type: 'TOGGLE_BUNDLE' });
assert(s.phase === 'generating', 'live: toggle off → on re-runs Form (B6 rule 6)');
const staleRun = s.runId - 1;
const during = s;
d({ type: 'BUNDLES_FORMED', runId: staleRun, bundles: handMade(), rejected: [], overrides: [] });
assert(s === during, 'BUNDLES_FORMED with a stale runId is ignored');
d({ type: 'GENERATION_FAILED', runId: s.runId });
assert(s.phase === 'failed' && selectIndex(s).listChats.length === NON_PROJECT + 2, 'GENERATION_FAILED → failed, list untouched (D9)');
assert(s.bundles !== null, 'a failed re-run keeps the previous bundles for the next merge');
d({ type: 'RETRY' });
assert(s.phase === 'generating', 'RETRY re-enters generating');
formLive([]);
assert(s.phase === 'thin', 'BUNDLES_FORMED with no bundles → thin');
d({ type: 'TOGGLE_BUNDLE' }); d({ type: 'TOGGLE_BUNDLE' });
d({ type: 'SET_FAIL_NEXT', value: true });
formLive(handMade());
assert(s.phase === 'failed' && !s.failNext, 'fail-next applies to the live path too');
flush('D3 — every chat exactly once with engine bundles');

// D6 — attach never renames and never moves any chat except the new one.
s = freshState();
d({ type: 'SET_ENGINE', mode: 'live' });
d({ type: 'TOGGLE_BUNDLE' });
formLive(handMade());
d({ type: 'COMMIT_RENAME', key: 'apartment', name: "Anaya's flat" });
d({ type: 'NEW_CHAT' }); // n1
const snapBundles = s.bundles;
const snapNames = { ...s.names };
const snapView = selectIndex(s);
d({ type: 'BUNDLE_ATTACHED', chatId: 'n1', bundleId: 'retirement', runnerUp: 'apartment', reason: 'Continues the annuity questions.' });
ix = selectIndex(s);
assert(ix.bundles.find((b) => b.key === 'retirement').chats.some((c) => c.id === 'n1') && s.journeys.J2, 'D6 the new chat joins the named bundle (J2)');
assert(s.highlightId === 'n1', 'D6 the joined chat is highlighted');
assert(s.lastAttach.bundleId === 'retirement' && s.lastAttach.runnerUp === 'apartment' && s.lastAttach.reason.length > 0, 'D6 lastAttach carries the reason and runner-up');
assert(JSON.stringify(s.names) === JSON.stringify(snapNames) && s.bundles.every((b, i) => b.name === snapBundles[i].name && b.nameSource === snapBundles[i].nameSource), 'D6 no bundle renamed');
assert(s.bundles.every((b, i) => b.id === 'retirement' || b === snapBundles[i]), 'D6 no other bundle object changed');
assert(
  ix.bundles.every((b) => {
    const prev = snapView.bundles.find((p) => p.key === b.key);
    const now = b.chats.map((c) => c.id).filter((id) => id !== 'n1');
    return prev && now.join() === prev.chats.map((c) => c.id).join();
  }),
  'D6 no other chat moved',
);
assert(ix.listChats.map((c) => c.id).join() === snapView.listChats.map((c) => c.id).filter((id) => id !== 'n1').join(), 'D6 All chats lost only the new chat');
partition(s, 'D6 partition · after attach');
// null / hidden / unknown targets
d({ type: 'NEW_CHAT' }); // n2
const beforeNull = s.bundles;
d({ type: 'BUNDLE_ATTACHED', chatId: 'n2', bundleId: null, runnerUp: 'spanish', reason: 'Not clearly any of them.' });
assert(s.bundles === beforeNull && s.lastAttach.bundleId === null && selectIndex(s).listChats.some((c) => c.id === 'n2'), 'D6 a null attach leaves membership alone; the chat stays in All chats');
d({ type: 'HIDE_BUNDLE', key: 'spanish' });
d({ type: 'BUNDLE_ATTACHED', chatId: 'n2', bundleId: 'spanish', runnerUp: null, reason: 'Spanish.' });
assert(!s.bundles.find((b) => b.id === 'spanish').chatIds.includes('n2'), 'D6 attach to a hidden bundle is refused (B6 rule 3)');
d({ type: 'BUNDLE_ATTACHED', chatId: 'n2', bundleId: 'b_nope', runnerUp: null, reason: '?' });
assert(s.bundles.every((b) => !b.chatIds.includes('n2')), 'D6 attach to an unknown bundle is refused');
d({ type: 'BUNDLE_ATTACHED', chatId: 'n1', bundleId: 'retirement', runnerUp: null, reason: 'again' });
assert(s.bundles.find((b) => b.id === 'retirement').chatIds.filter((id) => id === 'n1').length === 1, 'D6 attaching twice does not duplicate');
partition(s, 'D6 partition · after refused attaches');
flush('D6 — attach never renames, never moves another chat');

// D7 — corrections survive off → on with a re-formed run, and survive a reload.
s = freshState();
d({ type: 'SET_ENGINE', mode: 'live' });
d({ type: 'TOGGLE_BUNDLE' });
formLive(handMade());
d({ type: 'COMMIT_RENAME', key: 'apartment', name: "Anaya's flat" });
d({ type: 'REMOVE_FROM_BUNDLE', chatId: 'r4' });
d({ type: 'HIDE_BUNDLE', key: 'spanish' });
d({ type: 'TOGGLE_COLLAPSE', key: 'retirement' });
d({ type: 'TOGGLE_BUNDLE' });
assert(s.phase === 'off' && selectIndex(s).bundles.length === 0 && selectIndex(s).listChats.length === NON_PROJECT, 'D7 off means off');
d({ type: 'TOGGLE_BUNDLE' });
assert(s.phase === 'generating', 'D7 on re-runs Form in the live engine');
// the engine re-forms with the model proposing different names and r4 back in
const reformed = {
  clusters: [
    { key: 'c0', chatIds: ids('retirement'), cohesion: 0.7, days: 9 },
    { key: 'c1', chatIds: ids('apartment'), cohesion: 0.7, days: 5 },
    { key: 'c2', chatIds: ids('spanish'), cohesion: 0.7, days: 12 },
    ...(HAS_HEALTH ? [{ key: 'c3', chatIds: ids('health'), cohesion: 0.6, days: 4 }] : []),
  ],
  names: [
    { key: 'c0', name: 'Pension planning', domain: 'Finances', language: 'en', sensitive: false, concern: 'Retirement money.' },
    { key: 'c1', name: 'Flat hunting in Mumbai', domain: 'Housing', language: 'en', sensitive: false, concern: 'A flat near Dadar.' },
    { key: 'c2', name: 'Learning Spanish', domain: 'Language', language: 'en', sensitive: false, concern: 'Spanish practice.' },
    ...(HAS_HEALTH ? [{ key: 'c3', name: 'Health', domain: 'Health', language: 'en', sensitive: true, concern: 'Heart health.' }] : []),
  ],
};
const merged = mergeBundles(s, reformed);
formLive(merged.bundles, { overrides: merged.overrides });
ix = selectIndex(s);
assert(s.phase === 'ready', 'D7 re-formed run lands');
assert(ix.bundles.find((b) => b.key === 'apartment').name === "Anaya's flat", 'D7 rename survives off → on (rule 1)');
assert(!ix.bundles.some((b) => b.key === 'spanish') && ix.listChats.some((c) => c.id === 's1'), 'D7 hide survives off → on (rule 3)');
assert(ix.listChats.some((c) => c.id === 'r4') && !s.bundles.find((b) => b.id === 'retirement').chatIds.includes('r4'), 'D7 removal survives off → on (rule 2)');
assert(ix.bundles.find((b) => b.key === 'retirement').name === 'Retirement planning', 'D7 model name frozen from the first run (rule 5)');
assert(ix.bundles.find((b) => b.key === 'retirement').collapsed === true, 'D7 collapse state survives');
assert(s.overrides.some((o) => o.rule === 'person_name') && s.overrides.some((o) => o.rule === 'removed') && s.overrides.some((o) => o.rule === 'hidden') && s.overrides.some((o) => o.rule === 'name_frozen'), 'D7 the Merge stage sees every override');
partition(s, 'D7 partition · after re-formed run');
// simulated reload: only the four corrections are persisted, and they come back
const blob = JSON.parse(JSON.stringify(serializeCorrections(s)));
assert(Object.keys(blob).sort().join() === 'collapsed,hidden,names,removed', 'D7 only names/removed/hidden/collapsed are persisted');
assert(correctionsKey('meera') === 'bundle:corrections:meera', 'D7 storage key is scoped by scenario');
let reloaded = applyCorrections(freshState('meera'), blob);
assert(reloaded.bundles === null && reloaded.phase === 'off' && reloaded.liveChats.length === 0, 'D7 a reload restores nothing but corrections');
assert(reloaded.names.apartment === "Anaya's flat" && reloaded.removed.r4 && reloaded.hidden.spanish && reloaded.collapsed.retirement, 'D7 corrections restored after reload');
reloaded = reducer(reloaded, { type: 'TOGGLE_BUNDLE' });
reloaded = reducer(reloaded, { type: 'GENERATION_DONE', runId: reloaded.runId });
const rix = selectIndex(reloaded);
assert(rix.bundles.find((b) => b.key === 'apartment').name === "Anaya's flat" && !rix.bundles.some((b) => b.key === 'spanish') && rix.listChats.some((c) => c.id === 'r4'), 'D7 corrections apply on the first run after reload (sim path)');
assert(applyCorrections(freshState(), null) !== null && applyCorrections(freshState(), 'junk').names !== undefined && applyCorrections(freshState(), { names: 'x' }).names !== 'x', 'D7 malformed blobs are ignored');
assert(isDefaultCorrections(freshState()) && !isDefaultCorrections(s) && isDefaultCorrections(reducer(s, { type: 'RESET' })), 'D7 RESET returns to defaults (the provider removes the key)');
assert(reducer(s, { type: 'RESET' }).engine === 'live' && reducer(s, { type: 'SET_SCENARIO', scenario: 'fresh' }).engine === 'live', 'engine mode survives RESET and scenario swap');
assert(typeof window === 'undefined' ? hydrateState('meera').names && Object.keys(hydrateState('meera').names).length === 0 : true, 'D7 hydrateState works without a window (SSR)');
flush('D7 — corrections survive off → on and a reload');

// D11 — merge twice with the same clusters keeps ids and names; person names win.
s = freshState();
const firstRun = {
  clusters: [
    { key: 'c0', chatIds: ids('retirement').slice(0, 4), cohesion: 0.7, days: 4 },
    { key: 'c1', chatIds: ['u1', 'u2', 'u3', 'u4'], cohesion: 0.5, days: 4 },
    { key: 'c2', chatIds: ['u5', 'u6', 'u7', 'u8'], cohesion: 0.5, days: 4 },
  ],
  names: [
    { key: 'c0', name: 'Retirement planning', domain: 'Finances', language: 'en', sensitive: false, concern: 'Money after work.' },
    { key: 'c1', name: 'Odds and ends', domain: 'Home', language: 'en', sensitive: false, concern: 'Household.' },
    // c2 refused — no names entry
  ],
};
const m1 = mergeBundles(s, firstRun);
assert(m1.bundles.length === 2 && m1.overrides.some((o) => o.rule === 'no_specific_name'), 'D11 a cluster without a specific name is dropped and recorded');
assert(m1.bundles[0].id === 'retirement' && m1.bundles[1].id === 'b_c1', 'D11 ids: fixture concern when ≥ 50 % share it, else b_<key>');
assert(m1.bundles.every((b) => b.nameSource === 'model' && b.hidden === false), 'D11 first-run names come from the model');
s = { ...s, bundles: m1.bundles, phase: 'ready', bundleOn: true, everFormed: true };
const secondRun = {
  ...firstRun,
  names: firstRun.names.map((n) => ({ ...n, name: n.key === 'c0' ? 'Pension questions' : 'Household admin' })),
};
const m2 = mergeBundles(s, secondRun);
assert(m2.bundles.map((b) => b.id).join() === m1.bundles.map((b) => b.id).join(), 'D11 same clusters twice → same ids');
assert(m2.bundles.map((b) => b.name).join() === m1.bundles.map((b) => b.name).join(), 'D11 same clusters twice → same names (frozen)');
assert(m2.overrides.filter((o) => o.rule === 'name_frozen').length === 2, 'D11 each drifted proposal is recorded as an override');
assert(JSON.stringify(mergeBundles(s, secondRun)) === JSON.stringify(m2), 'D11 merge is deterministic');
// person-set name wins, on a matched and on an unmatched cluster
s = { ...s, names: { retirement: 'My pension', b_c1: 'House stuff' } };
const m3 = mergeBundles(s, secondRun);
assert(m3.bundles[0].name === 'My pension' && m3.bundles[0].nameSource === 'person', 'D11 a person-set name wins over the model (rule 1)');
assert(m3.overrides.filter((o) => o.rule === 'person_name').length === 2, 'D11 person-name overrides are recorded');
const m4 = mergeBundles({ ...freshState(), names: { retirement: 'My pension' } }, firstRun);
assert(m4.bundles[0].name === 'My pension' && m4.bundles[0].nameSource === 'person', 'D11 a person-set name applies on the very first engine run via the concern id');
// growth: a bundle that grew by attach still freezes its name (overlap over the smaller set)
const grown = { ...s, bundles: [{ ...m1.bundles[0], chatIds: ids('retirement') }, m1.bundles[1]] };
const m5 = mergeBundles(grown, secondRun);
assert(m5.bundles[0].id === 'retirement' && m5.bundles[0].name === 'My pension', 'D11 a grown bundle still matches (4 of 9 shared)');
assert(overlapScore(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) === 1, 'overlapScore is the share of the smaller set');
assert(majorityConcern(['r1', 'r2', 'u1', 'u2'], Object.fromEntries(MEERA_CHATS.map((c) => [c.id, c]))) === 'retirement', 'majorityConcern at exactly 50 %');
assert(majorityConcern(['r1', 'u1', 'u2'], Object.fromEntries(MEERA_CHATS.map((c) => [c.id, c]))) === null, 'majorityConcern below 50 % is null');
// removed + hidden through merge
const m6 = mergeBundles({ ...s, removed: { r1: true }, hidden: { b_c1: true } }, secondRun);
assert(!m6.bundles[0].chatIds.includes('r1') && m6.overrides.some((o) => o.rule === 'removed'), 'D11 removed chats are dropped from the model\'s cluster (rule 2)');
assert(m6.bundles[1].hidden === true && m6.overrides.some((o) => o.rule === 'hidden'), 'D11 hidden bundles are returned flagged (rule 3)');
const m7 = mergeBundles({ ...freshState(), removed: { u1: true, u2: true, u3: true, u4: true } }, firstRun);
assert(m7.bundles.length === 1, 'D11 a cluster emptied by removals is not formed');
flush('D11 — merge keeps ids and names on a second identical run');
