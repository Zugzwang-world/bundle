import { describe, it, expect } from 'vitest';
import { pairwise } from '../src/engine/similarity.js';
import { agglomerative } from '../src/engine/cluster.js';
import { applyRules, distinctDays } from '../src/engine/rules.js';
import { VECTORS, IDS, CHATS } from './fixtures.vectors.js';

const CFG = { minSize: 4, minDays: 2 };
const M = pairwise(IDS.map((id) => VECTORS.get(id)));

describe('applyRules', () => {
  const clusters = agglomerative(IDS, M, 0.8, VECTORS);
  const { candidates, rejected } = applyRules(clusters, CHATS, CFG);
  const reasonOf = (prefix) => rejected.find((r) => r.cluster.chatIds[0].startsWith(prefix))?.reason;

  it('keeps a cluster with size ≥ minSize on ≥ minDays days', () => {
    expect(candidates.map((c) => c.chatIds.join('+'))).toEqual(['a1+a2+a3+a4']);
    expect(candidates[0].days).toBe(4);
  });
  it("rejects a one-day cluster as 'not_ongoing'", () => {
    expect(reasonOf('b')).toBe('not_ongoing');
    expect(rejected.find((r) => r.cluster.chatIds[0] === 'b1').cluster.days).toBe(1);
  });
  it("rejects a small cluster as 'too_few' even when it spans days (size is checked first)", () => {
    expect(reasonOf('c')).toBe('too_few');
    expect(rejected.find((r) => r.cluster.chatIds[0] === 'c1').cluster.days).toBe(3);
  });
  it("rejects singletons as 'too_few'", () => {
    expect(reasonOf('u1')).toBe('too_few');
    expect(reasonOf('u2')).toBe('too_few');
    expect(rejected).toHaveLength(4);
  });
  it('sets days on every cluster (so the stage can show them)', () => {
    for (const c of clusters) expect(c.days).toBeGreaterThan(0);
  });
  it('accepts a Map for chatsById', () => {
    const map = new Map(Object.entries(CHATS));
    const r = applyRules(agglomerative(IDS, M, 0.8, VECTORS), map, CFG);
    expect(r.candidates).toHaveLength(1);
  });
});

describe('distinctDays', () => {
  it("counts 'today' as one day and ignores unknown ids", () => {
    expect(distinctDays(['c3', 'u1', 'u2'], CHATS)).toBe(1);
    expect(distinctDays(['c1', 'c3', 'nope'], CHATS)).toBe(2);
    expect(distinctDays(['b1', 'b2', 'b3', 'b4'], CHATS)).toBe(1);
  });
});
