// Agglomerative clustering, average linkage, deterministic.
// Two clusters merge while the best average pairwise similarity between them is ≥ tau.
// Ties are broken by lowest index pair, and clusters are iterated in index order, so the
// same input always yields the same output (the stability story depends on it).

import { cosine } from './similarity.js';

// Normalised mean of a list (or Map) of vectors.
export function centroid(vectors) {
  const list = vectors instanceof Map ? [...vectors.values()] : Array.from(vectors);
  if (list.length === 0) return new Float32Array(0);
  const dims = list[0].length;
  const out = new Float32Array(dims);
  for (const v of list) for (let d = 0; d < dims; d++) out[d] += v[d];
  let norm = 0;
  for (let d = 0; d < dims; d++) norm += out[d] * out[d];
  norm = Math.sqrt(norm) || 1;
  for (let d = 0; d < dims; d++) out[d] /= norm;
  return out;
}

// Short stable key from the sorted member ids: 'c' + djb2 hash, base36.
export function clusterKey(chatIds) {
  const s = [...chatIds].sort().join('+');
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return 'c' + h.toString(36);
}

function sortIds(ids) {
  return [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

// Mean pairwise similarity among member indices; 1 for singletons.
function cohesionOf(members, matrix) {
  if (members.length < 2) return 1;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < members.length; i++)
    for (let j = i + 1; j < members.length; j++) {
      sum += matrix[members[i]][members[j]];
      n++;
    }
  return sum / n;
}

/**
 * @param {string[]} ids            chat ids, matrix rows in the same order
 * @param {number[][]} matrix       pairwise cosine, symmetric
 * @param {number} tau              stop threshold (merge while best linkage ≥ tau)
 * @param {Map<string,Float32Array>|Record<string,Float32Array>=} vectors  for centroids
 * @param {{ onMerge?: (m: { score, a: string[], b: string[] }) => void }=} opts  merge trace (inspect mode)
 * @returns {Cluster[]}             sorted by first member index (stable), chatIds sorted
 */
export function agglomerative(ids, matrix, tau, vectors, { onMerge } = {}) {
  const n = ids.length;
  // clusters as arrays of member indices; each keeps its lowest index for ordering
  let clusters = [];
  for (let i = 0; i < n; i++) clusters.push([i]);

  // linkage cache: average similarity between cluster a and b (index into `clusters`)
  const linkage = (A, B) => {
    let sum = 0;
    for (const i of A) for (const j of B) sum += matrix[i][j];
    return sum / (A.length * B.length);
  };

  while (clusters.length > 1) {
    let best = -Infinity;
    let bi = -1;
    let bj = -1;
    for (let a = 0; a < clusters.length; a++) {
      for (let b = a + 1; b < clusters.length; b++) {
        const s = linkage(clusters[a], clusters[b]);
        if (s > best + 1e-12) {
          best = s;
          bi = a;
          bj = b;
        }
      }
    }
    if (best < tau) break;
    if (onMerge) onMerge({ score: best, a: clusters[bi].map((i) => ids[i]), b: clusters[bj].map((i) => ids[i]) });
    // merge bj into bi; keep member indices sorted so order stays canonical
    const merged = clusters[bi].concat(clusters[bj]).sort((x, y) => x - y);
    clusters.splice(bj, 1);
    clusters[bi] = merged;
    // keep clusters ordered by their lowest member index
    clusters.sort((A, B) => A[0] - B[0]);
  }

  const getVec = (id) => (vectors instanceof Map ? vectors.get(id) : vectors ? vectors[id] : undefined);

  return clusters.map((members) => {
    const chatIds = sortIds(members.map((i) => ids[i]));
    const vecs = chatIds.map(getVec).filter(Boolean);
    return {
      key: clusterKey(chatIds),
      chatIds,
      centroid: vecs.length ? centroid(vecs) : new Float32Array(0),
      cohesion: cohesionOf(members, matrix),
      days: 0,
    };
  });
}
