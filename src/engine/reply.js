import { complete } from './anthropic';

const SYSTEM = 'You are Claude. Answer helpfully and concisely, in a few short paragraphs at most.';

export function reply(userMessage) {
  return complete({ system: SYSTEM, messages: [{ role: 'user', content: userMessage }] });
}
