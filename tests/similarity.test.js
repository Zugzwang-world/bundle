import { describe, it, expect } from 'vitest';
import { cosine, pairwise, neighbours } from '../src/engine/similarity.js';
import { centroid } from '../src/engine/cluster.js';
import { nearest } from '../src/engine/attach.js';

const v = (...xs) => Float32Array.from(xs);

describe('cosine', () => {
  it('is 1 for identical, 0 for orthogonal, -1 for opposite', () => {
    expect(cosine(v(1, 0), v(1, 0))).toBeCloseTo(1, 6);
    expect(cosine(v(1, 0), v(0, 1))).toBeCloseTo(0, 6);
    expect(cosine(v(1, 0), v(-1, 0))).toBeCloseTo(-1, 6);
  });
  it('is scale invariant and 0 for a zero vector', () => {
    expect(cosine(v(1, 2, 3), v(2, 4, 6))).toBeCloseTo(1, 6);
    expect(cosine(v(0, 0), v(1, 1))).toBe(0);
  });
});

describe('pairwise', () => {
  it('returns a symmetric matrix with unit diagonal', () => {
    const m = pairwise([v(1, 0), v(1, 1), v(0, 1)]);
    expect(m.length).toBe(3);
    for (let i = 0; i < 3; i++) {
      expect(m[i][i]).toBe(1);
      for (let j = 0; j < 3; j++) expect(m[i][j]).toBeCloseTo(m[j][i], 9);
    }
    expect(m[0][1]).toBeCloseTo(Math.SQRT1_2, 6);
    expect(m[0][2]).toBeCloseTo(0, 6);
  });
});

describe('neighbours', () => {
  const m = [
    [1, 0.9, 0.2, 0.9],
    [0.9, 1, 0.5, 0.1],
    [0.2, 0.5, 1, 0.3],
    [0.9, 0.1, 0.3, 1],
  ];
  it('returns top-k excluding self, highest first, ties by lowest index', () => {
    expect(neighbours(m, 0, 2)).toEqual([
      { index: 1, score: 0.9 },
      { index: 3, score: 0.9 },
    ]);
    expect(neighbours(m, 2, 3).map((n) => n.index)).toEqual([1, 3, 0]);
  });
  it('caps at the available count', () => {
    expect(neighbours(m, 1, 10)).toHaveLength(3);
  });
});

describe('centroid', () => {
  it('is the normalised mean', () => {
    const c = centroid([v(1, 0), v(0, 1)]);
    expect(c[0]).toBeCloseTo(Math.SQRT1_2, 6);
    expect(c[1]).toBeCloseTo(Math.SQRT1_2, 6);
    expect(centroid(new Map([['a', v(2, 0)], ['b', v(4, 0)]]))).toEqual(v(1, 0));
    expect(centroid([]).length).toBe(0);
  });
});

describe('attach.nearest', () => {
  const cfg = { tauAttach: 0.5, delta: 0.05 };
  const bundles = [
    { id: 'x', centroid: v(1, 0) },
    { id: 'y', centroid: v(0, 1) },
    { id: 'z', centroid: v(Math.SQRT1_2, Math.SQRT1_2) },
  ];
  it('picks the top centroid above tauAttach and names the runner-up', () => {
    const r = nearest(v(0.95, 0.05), bundles, cfg);
    expect(r.bundleId).toBe('x');
    expect(r.runnerUp).toBe('z');
    expect(r.tie).toBe(false);
    expect(r.scores.map((s) => s.id)).toEqual(['x', 'z', 'y']);
  });
  it('returns null when nothing clears the threshold', () => {
    const r = nearest(v(-1, 0), bundles, cfg);
    expect(r.bundleId).toBeNull();
    expect(r.runnerUp).not.toBeNull();
    expect(r.tie).toBe(false);
  });
  it('flags a tie when the top two are within delta', () => {
    const r = nearest(v(1, 1), [bundles[0], bundles[1]], cfg);
    expect(r.bundleId).toBe('x'); // equal scores → lowest id
    expect(r.runnerUp).toBe('y');
    expect(r.tie).toBe(true);
    const near = nearest(v(1, 0.95), [bundles[0], bundles[1]], cfg); // 0.725 vs 0.689
    expect(near.tie).toBe(true);
    const far = nearest(v(1, 0.5), [bundles[0], bundles[1]], cfg);
    expect(far.bundleId).toBe('x');
    expect(far.tie).toBe(false);
  });
  it('handles a single bundle and no bundles', () => {
    expect(nearest(v(1, 0), [bundles[0]], cfg)).toMatchObject({ bundleId: 'x', runnerUp: null, tie: false });
    expect(nearest(v(1, 0), [], cfg)).toEqual({ bundleId: null, runnerUp: null, scores: [], tie: false });
  });
});
