import { reducer, freshState, selectIndex, isBundleCandidate } from '../src/state/store';
import { MEERA_CHATS, FRESH_CHATS, INCOMING_CHATS, sortKey } from '../src/data/chats';

let s = freshState();
const d = (a) => { s = reducer(s, a); };
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1); } console.log('ok —', msg); };

// baseline: off = today, byte for byte (A1)
let ix = selectIndex(s);
assert(ix.listChats.length === 34 && ix.bundles.length === 0 && !ix.showBundles, 'A1 off: flat list of 34, no bundles');
assert(ix.projects[0].chats.length === 2, 'project section intact');

// J-1
d({ type: 'TOGGLE_BUNDLE' });
assert(s.phase === 'generating', 'J-1 generating');
ix = selectIndex(s);
assert(ix.listChats.length === 34, 'INV-1: list untouched during generation');
d({ type: 'GENERATION_DONE', runId: s.runId });
assert(s.phase === 'ready' && s.journeys.J1, 'J-1 ready');
ix = selectIndex(s);
const counts = Object.fromEntries(ix.bundles.map(b => [b.key, b.chats.length]));
assert(counts.retirement === 9 && counts.apartment === 5 && counts.spanish === 12, 'formation counts 9/5/12');
assert(ix.listChats.length === 8, 'All chats = the 8 ungrouped (Fig. 3)');
assert(ix.bundles[0].key === 'retirement', 'bundles sort by most recent activity (§11)');

// J-2
d({ type: 'NEW_CHAT' });
ix = selectIndex(s);
assert(ix.bundles.find(b => b.key === 'retirement').chats.length === 10 && s.journeys.J2, 'J-2 joins: 9→10, name intact');
assert(ix.bundles.find(b => b.key === 'retirement').name === 'Retirement planning', 'J-2 name unchanged (A10)');

// J-3
d({ type: 'START_RENAME', key: 'apartment' });
d({ type: 'COMMIT_RENAME', key: 'apartment', name: "Anaya's flat" });
ix = selectIndex(s);
assert(ix.bundles.find(b => b.key === 'apartment').name === "Anaya's flat" && s.journeys.J3, 'J-3 renamed');

// J-4 + undo + re-remove
d({ type: 'REMOVE_FROM_BUNDLE', chatId: 'r4' });
ix = selectIndex(s);
assert(ix.listChats.some(c => c.id === 'r4') && s.toast.text === 'Removed from bundle.' && s.journeys.J4, 'J-4 removed → back in All chats + toast');
d({ type: 'UNDO_REMOVE', chatId: 'r4' });
assert(!selectIndex(s).listChats.some(c => c.id === 'r4'), 'J-4 undo restores membership');
d({ type: 'REMOVE_FROM_BUNDLE', chatId: 'r4' });

// J-5
d({ type: 'HIDE_BUNDLE', key: 'spanish' });
ix = selectIndex(s);
assert(!ix.bundles.some(b => b.key === 'spanish') && s.journeys.J5, 'J-5 hidden bundle gone');
assert(ix.listChats.some(c => c.id === 's1'), 'J-5 its chats visible chronologically');

// J-6 off means off, on resumes
d({ type: 'TOGGLE_BUNDLE' });
assert(s.phase === 'off' && s.journeys.J6, 'J-6 off instantly');
ix = selectIndex(s);
assert(ix.listChats.length === 35 && ix.bundles.length === 0, 'off restores flat list (34 + 1 arrival)');
d({ type: 'TOGGLE_BUNDLE' });
assert(s.phase === 'ready', 'J-6 back on resumes without regeneration');
ix = selectIndex(s);
assert(ix.bundles.find(b => b.key === 'apartment').name === "Anaya's flat", 'Q2 rename survives');
assert(!ix.bundles.some(b => b.key === 'spanish'), 'Q2 hide survives');
assert(ix.listChats.some(c => c.id === 'r4'), 'Q2 removal survives');

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
assert(selectIndex(s).listChats.length === 35, 'A12 index untouched on failure');
d({ type: 'RETRY' });
d({ type: 'GENERATION_DONE', runId: s.runId });
assert(s.phase === 'ready', 'A12 retry succeeds');

// A14 delete
d({ type: 'DELETE_CHAT', chatId: 'r1' });
ix = selectIndex(s);
assert(!ix.bundles.find(b => b.key === 'retirement').chats.some(c => c.id === 'r1'), 'A14 delete removes from bundle view');
assert(!ix.listChats.some(c => c.id === 'r1'), 'A14 delete removes from list');

// thin history
d({ type: 'SET_SCENARIO', scenario: 'fresh' });
assert(s.journeys.J1, 'journeys survive scenario swap');
d({ type: 'TOGGLE_BUNDLE' });
d({ type: 'GENERATION_DONE', runId: s.runId });
assert(s.phase === 'thin', 'fresh account → too little history');
assert(selectIndex(s).listChats.length === 4, 'thin: 4 chats, untouched');

// A5 — no bundle ever contains a Project chat or an incognito chat (INV-4 · §7.2).
// The rule is asserted where it lives (the predicate) and where it lands (the bundles).
s = freshState();
d({ type: 'TOGGLE_BUNDLE' });
d({ type: 'GENERATION_DONE', runId: s.runId });
ix = selectIndex(s);
const bundled = ix.bundles.flatMap((b) => b.chats);
assert(bundled.length === 26, 'A5 precondition: bundles formed (9+5+12)');
assert(ix.projects[0].chats.length === 2, 'A5 precondition: project chats exist to be excluded');
assert(!bundled.some((c) => c.project), 'A5 no bundle contains a Project chat');
assert(!bundled.some((c) => c.incognito), 'A5 no bundle contains an incognito chat');
assert(!isBundleCandidate({ id: 'z1', concern: 'retirement', project: 'bookclub/notes' }), 'A5 candidacy rejects a project chat');
assert(!isBundleCandidate({ id: 'z2', concern: 'retirement', incognito: true }), 'A5 candidacy rejects an incognito chat');
assert(isBundleCandidate({ id: 'z3', concern: 'retirement' }), 'A5 candidacy admits an ordinary chat');

// §11 — order is boring on purpose. Membership comes from an explicitly sorted candidate
// list, not from the order chats happen to be authored in data/chats.js.
const descending = (keys) => keys.every((k, i) => i === 0 || keys[i - 1] >= k);
s = freshState();
d({ type: 'TOGGLE_BUNDLE' });
d({ type: 'GENERATION_DONE', runId: s.runId });
d({ type: 'NEW_CHAT' }); // n1 · retirement · "today" — exercises the sortKey path
d({ type: 'NEW_CHAT' }); // n2 · spanish · "today"
ix = selectIndex(s);
assert(descending(ix.bundles.map((b) => sortKey(b.chats[0].date))), '§11 bundles ordered by most recent activity');
for (const b of ix.bundles) {
  assert(descending(b.chats.map((ch) => sortKey(ch.date))), `§11 rows newest-first inside ${b.key}`);
}
assert(ix.bundles[0].chats[0].id === 'n1', '§11 newest chat leads its bundle');
assert(descending(ix.listChats.map((ch) => sortKey(ch.date))), '§11 All chats stays newest-first');

// The derivation is total: no chat is lost or duplicated across the three outputs.
// Losing a chat is INV-2's named failure, and a derivation can do it as surely as an action.
const partition = (state, label) => {
  const base = state.scenario === 'meera' ? MEERA_CHATS : FRESH_CHATS;
  const expected = [...INCOMING_CHATS.filter((ch) => state.arrivals.includes(ch.id)), ...base]
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
// Injected here rather than shipped in the demo data, then removed again.
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

// INV-4 regression — the fail → memory-off → RETRY → GENERATION_DONE path.
// It used to reach phase 'ready' with memoryOn false and render three bundles.
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

// INV-4 is held by the derivation itself, not inferred from phase.
assert(!selectIndex({ ...s, phase: 'ready', memoryOn: false }).showBundles,
  'INV-4 selectIndex refuses bundles with memory off, whatever phase claims');

console.log('\nstate machine: all checks passed');
