import { forcedJson } from './anthropic.js';
import { TIEBREAK, EMIT_TIEBREAK } from './prompts.js';

// tieBreak(card, candidates) → { output: { bundle_id, runner_up, reason }, usage, ms, raw }
// card: { title, summary }; candidates: [{ id, name, concern, sample: string[] }] (sample = up to 4 member titles).
export function tieBreakMessage(card, candidates) {
  const cands = candidates.map((b, i) => {
    const sample = (b.sample || b.titles || []).slice(0, 4);
    return [
      `${i + 1}. id: ${b.id}`,
      `   name: ${b.name}`,
      `   concern: ${b.concern || ''}`,
      sample.length ? `   members: ${sample.join(' · ')}` : null,
    ].filter(Boolean).join('\n');
  });
  return `New chat:\n- ${card.title} — ${card.summary || ''}\n\nCandidate bundles:\n${cands.join('\n')}`;
}

export async function tieBreak(card, candidates) {
  if (!card || !Array.isArray(candidates) || candidates.length === 0) throw new Error('tieBreak: no candidates');
  const result = await forcedJson({
    system: TIEBREAK,
    tool: EMIT_TIEBREAK,
    messages: [{ role: 'user', content: tieBreakMessage(card, candidates) }],
  });
  const ids = new Set(candidates.map((b) => String(b.id)));
  const o = result.output || {};
  const bundle_id = ids.has(String(o.bundle_id)) ? String(o.bundle_id) : null;
  const ru = ids.has(String(o.runner_up)) && String(o.runner_up) !== bundle_id ? String(o.runner_up) : null;
  return { ...result, output: { bundle_id, runner_up: ru, reason: String(o.reason || '') } };
}
