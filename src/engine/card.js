import { forcedJson } from './anthropic.js';
import { CARD } from './prompts.js';

// The card is the only thing the grouping engine ever sees (B7 · Card).
// `concern` is an interim placement until the browser-side embedding stage lands:
// Claude picks one of the known concerns, or null. Never a name — names are frozen.
export const CARD_TOOL = {
  name: 'emit_card',
  description: 'Write the chat card: a title and a two-line summary.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short, noun-led, at most 6 words, as Claude titles chats.' },
      summary: { type: 'string', description: 'One or two plain sentences on what was asked and what was learned. At most 40 words.' },
      concern: {
        type: ['string', 'null'],
        enum: ['retirement', 'apartment', 'spanish', null],
        description: 'Which ongoing concern this chat clearly continues, or null if none.',
      },
      runner_up: { type: ['string', 'null'], enum: ['retirement', 'apartment', 'spanish', null] },
      reason: { type: 'string', description: 'One plain sentence on the placement.' },
    },
    required: ['title', 'summary', 'concern', 'reason'],
  },
};

const SYSTEM = `${CARD}
The person's index has three ongoing concerns: "retirement" (pension, SCSS, annuities, retirement money), "apartment" (flat hunting in Mumbai, brokers, registration), "spanish" (learning Spanish). Set concern to the one this chat clearly continues, else null. If two fit, pick the one whose concern the chat continues and put the other in runner_up.`;

export function card(userMessage, replyText) {
  return forcedJson({
    system: SYSTEM,
    tool: CARD_TOOL,
    messages: [{ role: 'user', content: `Chat transcript:\n\nPerson: ${userMessage}\n\nClaude: ${replyText}` }],
  });
}
