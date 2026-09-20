import { forcedJson } from '../engine/anthropic.js';
import { GATE, EMIT_GATE } from '../engine/prompts.js';
import { lexiconHit, looksLikePersonName } from './lexicon.js';
import { isNonName } from '../engine/name.js';

// The safety gate (HANDOVER B7 · Gate; spec §10). Layer 1 is code and pure; layer 2 is Claude.
// A health cluster renders as `Health`, never a condition. The gate fails closed.

const DOMAIN_ALIASES = {
  health: 'Health', medical: 'Health', medicine: 'Health', wellbeing: 'Health', wellness: 'Health',
  finances: 'Finances', finance: 'Finances', money: 'Finances', financial: 'Finances', banking: 'Finances',
  legal: 'Legal', law: 'Legal', personal: 'Personal', relationships: 'Personal', family: 'Family',
};

const CEILING_WORDS = new Set(['Health', 'Finances', 'Legal']);

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// A domain word that may itself render: short, not a lexicon hit, not a person, not a non-name.
export function safeDomain(domain) {
  if (typeof domain !== 'string') return null;
  const d = domain.trim().replace(/[.!]+$/, '');
  if (!d) return null;
  const alias = DOMAIN_ALIASES[d.toLowerCase()];
  if (alias) return alias;
  if (d.split(/\s+/).length > 2) return null;
  if (lexiconHit(d).hit || looksLikePersonName(d) || isNonName(d)) return null;
  return capitalise(d);
}

// The word a lexicon hit downgrades to.
export function domainWordFor(category, domain, term) {
  if (category === 'condition' || category === 'medication' || category === 'symptom') return 'Health';
  if (category === 'intimate') {
    const mapped = lexiconHit(term).domain;
    if (mapped) return mapped;
    return safeDomain(domain) || 'Personal';
  }
  return safeDomain(domain) || 'Health';
}

// gateLayer1({ name, domain, sensitive }) → { decision: 'pass'|'downgrade', replacement?, reason, term? }
export function gateLayer1(nameOutput) {
  const { name, domain } = nameOutput || {};
  if (typeof name !== 'string' || !name.trim()) {
    return { decision: 'downgrade', replacement: safeDomain(domain) || 'Personal', reason: 'Empty name.', term: null };
  }
  const hit = lexiconHit(name);
  if (hit.hit) {
    return {
      decision: 'downgrade',
      replacement: domainWordFor(hit.category, domain, hit.term),
      reason: `"${hit.term}" is a ${hit.category === 'intimate' ? 'private detail' : hit.category}; the name must stay at the domain.`,
      term: hit.term,
    };
  }
  // B7 · Name: "a health cluster is at most `Health`; money trouble `Finances`; legal `Legal`". The domain word
  // is a ceiling: "Health and diet" or "Legal notices" render as the bare word, and so does any sensitive
  // health cluster whatever it was called (A6 · D5).
  const words = name.trim().split(/\s+/);
  const ceiling = words.map((w) => DOMAIN_ALIASES[w.toLowerCase().replace(/[^\p{L}]/gu, '')]).find((w) => w && CEILING_WORDS.has(w));
  if (ceiling && (words.length > 1 || name.trim() !== ceiling)) {
    return { decision: 'downgrade', replacement: ceiling, reason: `A ${ceiling.toLowerCase()} cluster is at most "${ceiling}"; qualifiers are dropped.`, term: name };
  }
  if (nameOutput.sensitive === true && safeDomain(domain) === 'Health' && name.trim() !== 'Health') {
    return { decision: 'downgrade', replacement: 'Health', reason: 'A sensitive health cluster is at most "Health".', term: name };
  }
  if (looksLikePersonName(name)) {
    return {
      decision: 'downgrade',
      replacement: safeDomain(domain) || 'Personal',
      reason: 'The name reads as a person’s name; a bundle is never named after another person.',
      term: name,
    };
  }
  return { decision: 'pass', reason: 'Names a domain or activity; no lexicon or person-name hit.' };
}

function gateMessage(nameOutput, cards) {
  const { name, domain, language, sensitive, concern } = nameOutput;
  const lines = [
    `Generated name: ${name}`,
    `Domain: ${domain || '(none)'}`,
    `Language: ${language || 'en'}`,
    `Sensitive: ${sensitive === true}`,
    concern ? `Concern: ${concern}` : null,
  ].filter(Boolean);
  if (Array.isArray(cards) && cards.length) {
    lines.push('', `Member chats (${cards.length}):`, ...cards.slice(0, 12).map((c) => `- ${c.title}`));
  }
  return lines.join('\n');
}

// gateName(nameOutput, cards) → { decision: 'pass'|'downgrade'|'refuse', name: finalName|null, layer: 1|2, reason, raw }
export async function gateName(nameOutput, cards = []) {
  const l1 = gateLayer1(nameOutput);
  if (l1.decision === 'downgrade') {
    return { decision: 'downgrade', name: l1.replacement, layer: 1, reason: l1.reason, term: l1.term, raw: null };
  }
  const fallback = safeDomain(nameOutput.domain) || 'Personal';
  let result;
  try {
    result = await forcedJson({
      system: GATE,
      tool: EMIT_GATE,
      messages: [{ role: 'user', content: gateMessage(nameOutput, cards) }],
    });
  } catch (err) {
    return { decision: 'downgrade', name: fallback, layer: 2, reason: 'gate unavailable', raw: null, error: String(err?.message || err) };
  }
  const o = result.output || {};
  let decision = ['pass', 'downgrade', 'refuse'].includes(o.decision) ? o.decision : 'downgrade';
  let name = null;
  if (decision === 'pass') name = nameOutput.name;
  if (decision === 'downgrade') {
    // Claude's replacement must itself survive layer 1; otherwise use the domain word.
    const r = typeof o.replacement === 'string' && o.replacement.trim() ? o.replacement.trim() : '';
    name = r && gateLayer1({ name: r, domain: nameOutput.domain }).decision === 'pass' && !isNonName(r) ? r : fallback;
  }
  return { decision, name, layer: 2, reason: String(o.reason || ''), raw: result.raw, usage: result.usage, ms: result.ms };
}
