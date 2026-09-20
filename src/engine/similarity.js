// Pure vector maths. Vectors are unit-normalised Float32Arrays, so cosine is a dot product,
// but we divide by the norms anyway so un-normalised input still gives a cosine.

export function cosine(a, b) {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

// Symmetric n×n matrix of cosines; diagonal is 1.
export function pairwise(vectors) {
  const n = vectors.length;
  const m = new Array(n);
  for (let i = 0; i < n; i++) m[i] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    m[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const s = cosine(vectors[i], vectors[j]);
      m[i][j] = s;
      m[j][i] = s;
    }
  }
  return m;
}

// Top-k neighbours of row i (excluding i), highest score first; ties → lowest index.
export function neighbours(matrix, i, k = 3) {
  const row = matrix[i] || [];
  const out = [];
  for (let j = 0; j < row.length; j++) if (j !== i) out.push({ index: j, score: row[j] });
  out.sort((a, b) => b.score - a.score || a.index - b.index);
  return out.slice(0, k);
}
