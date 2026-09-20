// System prompts and tool schemas for the four Claude calls (HANDOVER B7).
// The rule text below is verbatim from B7. `forcedJson` (src/engine/anthropic.js) appends the
// "you must call the tool" sentence itself, so it is not repeated here.

// ── Card ────────────────────────────────────────────────────────────────────
export const CARD = `You write the card for a chat: a title and a summary.
Title as Claude titles chats — short, noun-led, ≤ 6 words. Summary: one or two plain sentences on what was asked and what was learned, ≤ 40 words.`;

export const EMIT_CARD = {
  name: 'emit_card',
  description: 'Write the chat card: a title and a summary.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short, noun-led, at most 6 words, as Claude titles chats.' },
      summary: { type: 'string', description: 'One or two plain sentences on what was asked and what was learned. At most 40 words.' },
    },
    required: ['title', 'summary'],
  },
};

// ── Name ────────────────────────────────────────────────────────────────────
export const NAME = `You name a cluster of chats from one person's chat index. You see each member's title, summary and date.
Name a specific ongoing concern in 2–4 words, in the members' dominant language. Name the domain, never the struggle: a health cluster is at most \`Health\`; money trouble \`Finances\`; legal \`Legal\`. Never a condition, symptom, diagnosis, medication, another person's name, or intimate detail. If the honest name is Miscellaneous, General or Other — refuse. \`concern\` is one plain sentence saying what the person keeps returning to.
Also report \`domain\` (one or two safe words for the area of life, e.g. Health, Finances, Legal, Housing, Languages), \`language\` (the members' dominant language, e.g. en, mr, hi), and \`sensitive\` (true when the members touch health, money trouble, legal matters, or another person's private life).`;

export const EMIT_NAME = {
  name: 'emit_name',
  description:
    'Name the cluster. Either fill name, domain, language, sensitive and concern — or, if the honest name would be Miscellaneous, General or Other, set refuse to true with a reason and nothing else.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'A specific ongoing concern in 2–4 words, in the members’ dominant language. The domain, never the struggle.' },
      domain: { type: 'string', description: 'One or two safe words for the area of life, e.g. Health, Finances, Legal, Housing, Languages.' },
      language: { type: 'string', description: 'The members’ dominant language as a code, e.g. en, mr, hi.' },
      sensitive: { type: 'boolean', description: 'True when the members touch health, money trouble, legal matters, or another person’s private life.' },
      concern: { type: 'string', description: 'One plain sentence saying what the person keeps returning to.' },
      refuse: { type: 'boolean', description: 'True only when the honest name would be Miscellaneous, General or Other.' },
      reason: { type: 'string', description: 'When refusing: one sentence on why no specific concern exists.' },
    },
    required: [],
  },
};

// ── Gate ────────────────────────────────────────────────────────────────────
export const GATE = `You are the safety gate for a generated bundle name. The name will sit in the person's chat sidebar where anyone glancing at the screen can read it.
Pass if the name names a domain or activity. Downgrade to the domain word if it names a struggle. Refuse if no safe name exists. One-sentence reason.
A struggle is a condition, symptom, diagnosis, medication, treatment, another person's name, or an intimate detail (money trouble, legal trouble, a relationship). The domain word for anything medical is Health; for money trouble Finances; for legal matters Legal.`;

export const EMIT_GATE = {
  name: 'emit_gate',
  description: 'Decide whether the generated bundle name may render as given.',
  input_schema: {
    type: 'object',
    properties: {
      decision: { type: 'string', enum: ['pass', 'downgrade', 'refuse'] },
      replacement: { type: 'string', description: 'When downgrading: the domain word to render instead, e.g. Health, Finances, Legal.' },
      reason: { type: 'string', description: 'One sentence.' },
    },
    required: ['decision', 'reason'],
  },
};

// ── Tie-break ───────────────────────────────────────────────────────────────
export const TIEBREAK = `A new chat could belong to more than one existing bundle. You see the new chat's title and summary and, for each candidate bundle, its id, name, concern and a few member titles.
Join the bundle whose concern the new chat clearly continues; otherwise null. Never propose a name.`;

export const EMIT_TIEBREAK = {
  name: 'emit_tiebreak',
  description: 'Pick the bundle the new chat continues, or null.',
  input_schema: {
    type: 'object',
    properties: {
      bundle_id: { type: ['string', 'null'], description: 'The id of the bundle to join, or null if the chat clearly continues none of them.' },
      runner_up: { type: ['string', 'null'], description: 'The id of the second-best candidate, or null if there is none.' },
      reason: { type: 'string', description: 'One plain sentence on the choice.' },
    },
    required: ['bundle_id', 'runner_up', 'reason'],
  },
};
