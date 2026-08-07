import { reducer, freshState, selectIndex } from '../src/state/store';

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

console.log('\nstate machine: all checks passed');
