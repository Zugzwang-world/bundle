import { describe, it, expect } from 'vitest';
import { pairwise } from '../src/engine/similarity.js';
import { agglomerative, clusterKey } from '../src/engine/cluster.js';
import { VECTORS, IDS } from './fixtures.vectors.js';

const M = pairwise(IDS.map((id) => VECTORS.get(id)));
const members = (clusters) => clusters.map((c) => c.chatIds.join('+'));

describe('agglomerative (average linkage)', () => {
  it('forms the three planted groups at tau 0.8 and leaves the singles alone', () => {
    const clusters = agglomerative(IDS, M, 0.8, VECTORS);
    expect(members(clusters)).toEqual(['a1+a2+a3+a4', 'b1+b2+b3+b4', 'c1+c2+c3', 'u1', 'u2']);
  });
  it('merges everything at tau 0 and nothing at tau 1', () => {
    expect(agglomerative(IDS, M, -1)).toHaveLength(1);
    expect(agglomerative(IDS, M, 1.01)).toHaveLength(IDS.length);
  });
  it('sorts chatIds within a cluster and orders clusters by first input index', () => {
    const shuffled = ['b3', 'a2', 'u2', 'a1', 'b1', 'c3', 'c1', 'a4', 'b4', 'u1', 'a3', 'c2', 'b2'];
    const m = pairwise(shuffled.map((id) => VECTORS.get(id)));
    const clusters = agglomerative(shuffled, m, 0.8, VECTORS);
    expect(members(clusters)).toEqual(['b1+b2+b3+b4', 'a1+a2+a3+a4', 'u2', 'c1+c2+c3', 'u1']);
  });
  it('gives cohesion = mean pairwise similarity, 1 for singletons', () => {
    const clusters = agglomerative(IDS, M, 0.8, VECTORS);
    const a = clusters[0];
    let sum = 0;
    let n = 0;
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) (sum += M[i][j]), n++;
    expect(a.cohesion).toBeCloseTo(sum / n, 9);
    expect(a.cohesion).toBeGreaterThan(0.9);
    expect(clusters.at(-1).cohesion).toBe(1);
  });
  it('computes a normalised centroid from the given vectors and leaves days at 0', () => {
    const [a] = agglomerative(IDS, M, 0.8, VECTORS);
    expect(a.centroid).toBeInstanceOf(Float32Array);
    expect(a.centroid.length).toBe(4);
    let norm = 0;
    for (const x of a.centroid) norm += x * x;
    expect(Math.sqrt(norm)).toBeCloseTo(1, 5);
    expect(a.centroid[0]).toBeGreaterThan(0.99);
    expect(a.days).toBe(0);
    const [noVec] = agglomerative(IDS, M, 0.8);
    expect(noVec.centroid.length).toBe(0);
  });
  it('keys are stable, derived from sorted member ids, and unique per membership', () => {
    const clusters = agglomerative(IDS, M, 0.8, VECTORS);
    expect(clusters[0].key).toBe(clusterKey(['a4', 'a1', 'a3', 'a2']));
    expect(new Set(clusters.map((c) => c.key)).size).toBe(clusters.length);
    expect(clusters[0].key).toMatch(/^c[0-9a-z]+$/);
  });
  it('is deterministic: the same input twice gives deep-equal clusters', () => {
    const one = agglomerative(IDS, M, 0.6, VECTORS);
    const two = agglomerative(IDS, M, 0.6, VECTORS);
    expect(two).toEqual(one);
    expect(JSON.stringify(two.map((c) => [c.key, c.chatIds, c.cohesion]))).toBe(
      JSON.stringify(one.map((c) => [c.key, c.chatIds, c.cohesion])),
    );
  });
  it('breaks exact ties by the lowest index pair', () => {
    // four identical directions: merges happen in index order, all end in one cluster
    const ids = ['p', 'q', 'r', 's'];
    const m = [
      [1, 0.5, 0.5, 0.5],
      [0.5, 1, 0.5, 0.5],
      [0.5, 0.5, 1, 0.5],
      [0.5, 0.5, 0.5, 1],
    ];
    expect(members(agglomerative(ids, m, 0.5))).toEqual(['p+q+r+s']);
    // 0.5 is inclusive; just above breaks it
    expect(agglomerative(ids, m, 0.5001)).toHaveLength(4);
  });
  it('uses average linkage, not single linkage', () => {
    // x–y strong, y–z strong, x–z weak: single linkage would chain all three at 0.7
    const ids = ['x', 'y', 'z'];
    const m = [
      [1, 0.9, 0.0],
      [0.9, 1, 0.8],
      [0.0, 0.8, 1],
    ];
    // after x+y merge, avg(xy, z) = (0 + 0.8) / 2 = 0.4 < 0.7 → stop
    expect(members(agglomerative(ids, m, 0.7))).toEqual(['x+y', 'z']);
  });
});
