// End-to-end engine test on the real Meera fixtures. Embeds with the real model
// (vendored under public/models when present, else the Hugging Face hub — network).
// Skipped when src/data/meera.json has not been generated yet.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from '../src/engine/config.js';
import { formClusters } from '../src/engine/form.js';
import { clearCache } from '../src/engine/embed.js';
import { nearest } from '../src/engine/attach.js';

const FILE = path.resolve(process.cwd(), 'src/data/meera.json');
const has = fs.existsSync(FILE);
const fixture = has ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : null;
const cards = fixture ? fixture.meera || fixture.chats || fixture : [];

const GROUPS = {
  retirement: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9'],
  apartment: ['a1', 'a2', 'a3', 'a4', 'a5'],
  spanish: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12'],
  health: ['h1', 'h2', 'h3', 'h4'],
};
const SINGLES = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8'];
const PROJECT = ['p1', 'p2'];
// What the tuned CONFIG actually forms with the vendored Xenova/all-MiniLM-L6-v2 on the current
// summaries (docs/STATE.md → Engine). Update these when the fixtures or the model change.
const TUNED = {
  retirement: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9'],
  apartment: ['a1', 'a2', 'a3', 'a4', 'a5'],
  spanish: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's10', 's11', 's12'], // s9 pairs with u1 (too_few)
  health: ['h1', 'h2', 'h3', 'h4'],
};
const key = (ids) => [...ids].sort().join('+');
const strip = (r) => ({
  candidates: r.candidates.map((c) => ({ key: c.key, chatIds: c.chatIds, cohesion: c.cohesion, days: c.days })),
  rejected: r.rejected.map(({ cluster, reason }) => ({ key: cluster.key, chatIds: cluster.chatIds, reason })),
  edges: r.edges,
});

describe.skipIf(!has)('engine on the Meera life', () => {
  let first;
  let events;

  it('embeds every card to a 384-dim unit vector and emits stage events', async () => {
    events = [];
    first = await formClusters(cards, CONFIG, { onEvent: (e) => events.push(e), runId: 'test-1' });
    expect(first.ids).toHaveLength(cards.length - PROJECT.length);
    for (const id of first.ids) {
      const v = first.vectors.get(id);
      expect(v).toBeInstanceOf(Float32Array);
      expect(v.length).toBe(384);
      let n = 0;
      for (const x of v) n += x * x;
      expect(Math.sqrt(n)).toBeCloseTo(1, 3);
    }
    const stages = events.map((e) => `${e.stage}:${e.status}`);
    expect(stages).toEqual(['embed:running', 'embed:done', 'map:running', 'map:done', 'rules:running', 'rules:done']);
    const embedDone = events.find((e) => e.stage === 'embed' && e.status === 'done');
    expect(embedDone.output).toMatchObject({ count: cards.length - PROJECT.length, dims: 384 });
    expect(embedDone.output.sample).toHaveLength(8);
    const mapDone = events.find((e) => e.stage === 'map' && e.status === 'done');
    expect(mapDone.output.edges).toEqual(first.edges);
    expect(Object.keys(mapDone.output.neighbours)).toHaveLength(cards.length - PROJECT.length);
    expect(mapDone.output.neighbours[first.ids[0]]).toHaveLength(3);
    for (const e of first.edges) expect(e.score).toBeGreaterThanOrEqual(CONFIG.tauEdge);
  });

  it('forms the tuned candidates: retirement (8 of 9) and spanish (5 of 12), nothing impure', () => {
    const got = first.candidates.map((c) => key(c.chatIds)).sort();
    expect(got).toEqual(Object.values(TUNED).map(key).sort());
    // every candidate is pure: all members share one fixture concern (the hint is read by the
    // test only, never by the engine)
    const concernOf = new Map(cards.map((c) => [c.id, c.concern]));
    for (const c of first.candidates) expect(new Set(c.chatIds.map((id) => concernOf.get(id))).size).toBe(1);
    for (const c of first.candidates) {
      expect(c.chatIds.length).toBeGreaterThanOrEqual(CONFIG.minSize);
      expect(c.days).toBeGreaterThanOrEqual(CONFIG.minDays);
      expect(c.centroid.length).toBe(384);
    }
  });

  it('forms retirement, apartment, spanish and health — four candidates, each pure', () => {
    expect(first.candidates).toHaveLength(4);
    const concernOf = new Map(cards.map((c) => [c.id, c.concern]));
    const formed = new Set();
    for (const c of first.candidates) {
      const concerns = new Set(c.chatIds.map((id) => concernOf.get(id)));
      expect([...concerns]).toHaveLength(1); // pure
      const [concern] = concerns;
      formed.add(concern);
      // every member is a real member of that concern group (no single, no project chat)
      for (const id of c.chatIds) expect(GROUPS[concern]).toContain(id);
    }
    expect([...formed].sort()).toEqual(Object.keys(GROUPS).sort());
  });

  it('leaves the 8 singles and the 2 project chats out of every candidate', () => {
    const inCandidates = new Set(first.candidates.flatMap((c) => c.chatIds));
    for (const id of [...SINGLES, ...PROJECT]) expect(inCandidates.has(id)).toBe(false);
    // project chats are excluded from formation altogether (INV-4)
    expect(first.excluded.sort()).toEqual(PROJECT);
    expect(first.ids).not.toContain('p1');
    for (const { cluster, reason } of first.rejected) {
      expect(['too_few', 'not_ongoing']).toContain(reason);
      if (cluster.chatIds.length < CONFIG.minSize) expect(reason).toBe('too_few');
    }
    // every chat is either in a candidate or in a rejected cluster, exactly once
    const all = [...first.candidates, ...first.rejected.map((r) => r.cluster)].flatMap((c) => c.chatIds).sort();
    expect(all).toEqual([...first.ids].sort());
  });

  it('is identical on a second run, with and without the vector cache', async () => {
    const second = await formClusters(cards, CONFIG, { runId: 'test-2' });
    expect(strip(second)).toEqual(strip(first));
    clearCache();
    const third = await formClusters(cards, CONFIG, { runId: 'test-3' });
    expect(strip(third)).toEqual(strip(first));
    expect(third.candidates.map((c) => c.key)).toEqual(first.candidates.map((c) => c.key));
  });

  it('attaches the incoming chats to the expected bundle (when incoming fixtures exist)', async () => {
    const incoming = fixture.incoming || [];
    if (!incoming.length) return;
    const { embedCards } = await import('../src/engine/embed.js');
    const vecs = await embedCards(incoming);
    // bundle ids per the contract: a known concern when ≥ 50% of the members overlap it
    const bundles = first.candidates.map((c) => {
      const hint = Object.entries(GROUPS).find(([, ids]) => c.chatIds.filter((id) => ids.includes(id)).length * 2 >= c.chatIds.length)?.[0];
      return { id: hint || 'b_' + c.key, centroid: c.centroid };
    });
    const placed = {};
    for (const chat of incoming) {
      const r = nearest(vecs.get(chat.id), bundles, CONFIG);
      expect(r.scores).toHaveLength(bundles.length);
      if (chat.concern) expect(r.scores[0].id).toBe(chat.concern);
      placed[chat.id] = r.bundleId;
    }
    // n1 (annuity quotes) and n2 (taxi in Spanish) clear tauAttach; n3 (nominee vs heir) is
    // the honest residue at 0.28 and stays unattached
    expect(placed).toEqual({ n1: 'retirement', n2: 'spanish', n3: null });
  });
});
