// Pure-vector fixture shared by cluster/rules tests: three tight groups in 4-D, two singles,
// no network. Vectors are unit-normalised so cosine is well behaved.
const unit = (xs) => {
  const n = Math.hypot(...xs) || 1;
  return Float32Array.from(xs.map((x) => x / n));
};
// group A around e1, group B around e2, group C around e3; singles between/elsewhere
export const VECTORS = new Map([
  ['a1', unit([1, 0.05, 0, 0])],
  ['a2', unit([1, 0, 0.05, 0])],
  ['a3', unit([1, 0.02, 0.02, 0.02])],
  ['a4', unit([0.95, 0.1, 0, 0])],
  ['b1', unit([0, 1, 0.05, 0])],
  ['b2', unit([0.05, 1, 0, 0])],
  ['b3', unit([0, 0.95, 0.1, 0])],
  ['b4', unit([0.02, 1, 0.02, 0.02])],
  ['c1', unit([0, 0, 1, 0.05])],
  ['c2', unit([0.05, 0, 1, 0])],
  ['c3', unit([0, 0.05, 0.95, 0])],
  ['u1', unit([0.5, 0.5, 0.5, 0.5])],
  ['u2', unit([0, 0, 0, 1])],
]);
export const IDS = [...VECTORS.keys()];
export const CHATS = {
  a1: { id: 'a1', date: '2026-06-01' },
  a2: { id: 'a2', date: '2026-06-02' },
  a3: { id: 'a3', date: '2026-06-03' },
  a4: { id: 'a4', date: '2026-06-04' },
  b1: { id: 'b1', date: '2026-05-01' }, // group b: all on one day
  b2: { id: 'b2', date: '2026-05-01' },
  b3: { id: 'b3', date: '2026-05-01' },
  b4: { id: 'b4', date: '2026-05-01' },
  c1: { id: 'c1', date: '2026-04-01' }, // group c: 3 chats → too few
  c2: { id: 'c2', date: '2026-04-02' },
  c3: { id: 'c3', date: 'today' },
  u1: { id: 'u1', date: 'today' },
  u2: { id: 'u2', date: 'today' },
};
