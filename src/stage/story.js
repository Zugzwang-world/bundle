// The story — captions verbatim from HANDOVER_v0.2 §B8, the stage lists per run kind,
// and the dwell each card holds the story clock for (Form ≈ 20 s, Attach ≈ 12 s).

export const CAPTIONS = {
  card: 'Claude reads the chat once and writes its card: a title and a two-line summary. Nothing downstream ever sees more than this.',
  embed: 'The card becomes a point in a space of meaning. Chats about the same thing land close together. Computed on this laptop.',
  map: 'Every chat is a dot; near dots are joined. Groups you can see are groups the code can find.',
  rules: 'A group is real only if it passes three tests from the spec: at least four chats, spread over at least two days, and nameable.',
  name: 'Claude reads the members and writes a specific name — or refuses. "Miscellaneous" is not a name.',
  gate: 'Before a name reaches your sidebar it passes two checks. A health scare becomes Health. Never a condition, never a person.',
  merge: 'Your corrections outrank the model, a new chat never renames anything, and the list beneath never moves.',
  attach: 'The new dot lands next to its nearest neighbours.',
  tiebreak: 'Two groups are close. Claude picks one and says why.',
};

// Human titles for the cards (B8 names) and the technique line in mono.
const CARD = { key: 'card', title: 'Card', technique: 'claude · emit_card', dwell: 2000 };
const EMBED = { key: 'embed', title: 'Understanding', technique: 'transformers.js · MiniLM-L6', dwell: 3000 };
const MERGE = { key: 'merge', title: 'Stability → render', technique: 'merge · B6', dwell: 2000, alias: ['render'] };

export const FORM_STAGES = [
  CARD,
  EMBED,
  { key: 'map', title: 'Concern map', technique: 'cosine · average-linkage', dwell: 4000 },
  { key: 'rules', title: 'Formation rules', technique: 'rules · size≥4 · days≥2', dwell: 3000 },
  { key: 'name', title: 'Naming', technique: 'claude · emit_name', dwell: 3000 },
  { key: 'gate', title: 'Safety gate', technique: 'lexicon → claude · emit_gate', dwell: 3000 },
  MERGE,
]; // dwell total: 20 000 ms

export const ATTACH_STAGES = [
  { ...CARD, dwell: 2000 },
  { ...EMBED, dwell: 2500 },
  { key: 'attach', title: 'Attach map', technique: 'cosine · nearest centroid', dwell: 4000 },
  { key: 'tiebreak', title: 'Tie-break', technique: 'claude · emit_tiebreak', dwell: 2000 },
  { ...MERGE, dwell: 1500 },
]; // dwell total: 12 000 ms

// A card whose stage never emits (a skipped tie-break) holds the clock only this long.
export const SKIP_DWELL = 700;

export function stagesFor(kind) {
  return kind === 'attach' ? ATTACH_STAGES : FORM_STAGES;
}

export function totalDwell(kind) {
  return stagesFor(kind).reduce((s, st) => s + st.dwell, 0);
}

// Claude stages carry raw request/response; code stages carry numbers.
export const CLAUDE_STAGES = new Set(['card', 'name', 'gate', 'tiebreak']);
