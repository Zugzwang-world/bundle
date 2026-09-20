// Attach: nearest bundle centroid ≥ tauAttach; top two within delta → tie (caller runs Tie-break).
import { cosine } from './similarity.js';

/**
 * @param {Float32Array} vector
 * @param {{ id: string, centroid: Float32Array }[]} bundles
 * @param {{ tauAttach: number, delta: number }} config
 * @returns {{ bundleId: string|null, runnerUp: string|null, scores: { id: string, score: number }[], tie: boolean }}
 */
export function nearest(vector, bundles, config) {
  const scores = bundles
    .filter((b) => b && b.centroid && b.centroid.length)
    .map((b) => ({ id: b.id, score: cosine(vector, b.centroid) }));
  scores.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const top = scores[0];
  const second = scores[1];
  const bundleId = top && top.score >= config.tauAttach ? top.id : null;
  const runnerUp = second ? second.id : null;
  const tie = Boolean(bundleId && second && top.score - second.score <= config.delta);
  return { bundleId, runnerUp, scores, tie };
}
