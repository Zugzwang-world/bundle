import { forcedJson } from './anthropic.js';
import { NAME, EMIT_NAME } from './prompts.js';

// Names that are not names (B7 · Name; A6 · D4). The pipeline treats such an answer as a refusal.
const NON_NAMES = new Set(['miscellaneous', 'general', 'other', 'misc', 'various', 'random', 'others', 'uncategorised', 'uncategorized', 'assorted', 'mixed']);

export function isNonName(name) {
  if (typeof name !== 'string') return true;
  const n = name.trim().toLowerCase().replace(/[.!]+$/, '');
  if (!n) return true;
  if (NON_NAMES.has(n)) return true;
  // "Other chats", "General questions", "Miscellaneous topics", "Various things"…
  const words = n.split(/\s+/);
  return words.length <= 3 && NON_NAMES.has(words[0]);
}

export function clusterMessage(cards) {
  const lines = cards.map((c) => `- ${c.title} — ${c.summary || ''} (${c.date || ''})`);
  return `Chats in this cluster (${cards.length}):\n${lines.join('\n')}`;
}

// nameCluster(cards) → { output, usage, ms, raw }
// output is { name, domain, language, sensitive, concern } or { refuse: true, reason }.
export async function nameCluster(cards) {
  if (!Array.isArray(cards) || cards.length === 0) throw new Error('nameCluster: no cards');
  const result = await forcedJson({
    system: NAME,
    tool: EMIT_NAME,
    messages: [{ role: 'user', content: clusterMessage(cards) }],
  });
  const o = result.output || {};
  let output;
  if (o.refuse === true || !o.name) {
    output = { refuse: true, reason: String(o.reason || 'No specific ongoing concern.') };
  } else if (isNonName(o.name)) {
    output = { refuse: true, reason: `Model named the cluster "${o.name}", which is not a specific concern.` };
  } else {
    output = {
      name: String(o.name).trim(),
      domain: String(o.domain || '').trim(),
      language: String(o.language || 'en').trim(),
      sensitive: o.sensitive === true,
      concern: String(o.concern || '').trim(),
    };
  }
  return { ...result, output };
}
