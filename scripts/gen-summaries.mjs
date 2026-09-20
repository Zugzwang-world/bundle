// Generates the fixture summaries once, via the Messages API, into src/data/meera.json.
//
//   node --env-file=.env scripts/gen-summaries.mjs      (or: npm run gen:summaries)
//
// Idempotent: a chat that already has a summary in meera.json is skipped, so re-running
// only fills gaps (new chats, or a chat whose summary was blanked to regenerate it).
// Output shape: { meera: Chat[40], incoming: Chat[], fresh: Chat[] } where
// Chat = { id, title, summary, date, concern, project, source: 'fixture' }.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../src/data/meera.json');
const CHATS_MODULE = resolve(here, '../src/data/chats.js');

const API_KEY = process.env.VITE_ANTHROPIC_API_KEY;
const MODEL = process.env.VITE_MODEL || 'claude-fable-5-1';
const CONCURRENCY = 6;
const MAX_WORDS = 40;

if (!API_KEY) {
  console.error('VITE_ANTHROPIC_API_KEY is not set. Run with: node --env-file=.env scripts/gen-summaries.mjs');
  process.exit(1);
}

const SYSTEM = `You write one-line index summaries of past chats between a person and Claude.
The person is Meera, seventy, retired, living in Mumbai; she asks practical questions in plain English.
Given a chat title and its date, imagine the chat happened and write a summary of what she asked and what she learned, as it would appear in a chat index.

Rules:
- At most ${MAX_WORDS} words. One or two plain sentences. No heading, no quotes, no markdown, no preamble.
- Third person ("She asked…", "Claude explained…") or impersonal; never address the reader.
- Concrete and specific to the title, but invent nothing dramatic: keep health topics calm and non-graphic, and keep finances and places plausible for Mumbai in 2026.
- Do not mention the date. Reply with the summary text only.`;

// Skeleton so src/data/chats.js can import meera.json before anything has been generated.
async function loadExisting() {
  try {
    return JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    const empty = { meera: [], incoming: [], fresh: [] };
    await mkdir(dirname(OUT), { recursive: true });
    await writeFile(OUT, JSON.stringify(empty, null, 2) + '\n');
    return empty;
  }
}

const words = (s) => s.trim().split(/\s+/).filter(Boolean);

function cleanup(text) {
  let t = text.replace(/\s+/g, ' ').trim();
  t = t.replace(/^(summary|index summary)\s*:\s*/i, '').replace(/^["“]|["”]$/g, '').trim();
  return t;
}

async function callClaude(chat, attempt = 0) {
  const nudge = attempt ? ` Your previous answer was too long; this time use at most ${MAX_WORDS - 8} words.` : '';
  const body = {
    model: MODEL,
    max_tokens: 1500, // the model thinks first; smaller budgets come back with empty text
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Chat title: ${chat.title}\nDate: ${chat.date}${chat.project ? `\nProject: ${chat.project}` : ''}${nudge}`,
      },
    ],
  };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${json?.error?.message || JSON.stringify(json)}`);
  if (json.stop_reason === 'refusal') throw new Error(`refused: ${json.stop_details?.category || 'unknown'}`);
  const text = (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const summary = cleanup(text);
  if (!summary) throw new Error(`empty text (stop_reason ${json.stop_reason})`);
  if (words(summary).length > MAX_WORDS) {
    if (attempt < 2) return callClaude(chat, attempt + 1);
    return words(summary).slice(0, MAX_WORDS).join(' ').replace(/[,;:]$/, '') + '.';
  }
  return summary;
}

async function withRetry(fn, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const transient = /^(429|5\d\d|overloaded)|fetch failed|ECONN|ETIMEDOUT/.test(String(e.message));
      if (!transient || i === tries - 1) break;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** i));
    }
  }
  throw last;
}

async function main() {
  const existing = await loadExisting();
  const { MEERA_CHATS, INCOMING_CHATS, FRESH_CHATS } = await import(CHATS_MODULE);

  const known = new Map(
    [...(existing.meera || []), ...(existing.incoming || []), ...(existing.fresh || [])]
      .filter((ch) => ch.summary)
      .map((ch) => [ch.id, ch.summary]),
  );

  const toRecord = (ch) => ({
    id: ch.id,
    title: ch.title,
    summary: known.get(ch.id) || '',
    date: ch.date,
    concern: ch.concern ?? null,
    project: ch.project ?? null,
    source: 'fixture',
  });
  const out = {
    meera: MEERA_CHATS.map(toRecord),
    incoming: INCOMING_CHATS.map(toRecord),
    fresh: FRESH_CHATS.map(toRecord),
  };
  const all = [...out.meera, ...out.incoming, ...out.fresh];
  const todo = all.filter((ch) => !ch.summary);
  console.log(`${all.length} chats · ${all.length - todo.length} already summarised · ${todo.length} to generate (${MODEL})`);

  const save = () => writeFile(OUT, JSON.stringify(out, null, 2) + '\n');
  await save();

  let failures = 0;
  let cursor = 0;
  const worker = async () => {
    while (cursor < todo.length) {
      const chat = todo[cursor++];
      try {
        chat.summary = await withRetry(() => callClaude(chat));
        console.log(`ok  ${chat.id.padEnd(3)} ${chat.title}\n    → ${chat.summary}`);
        await save();
      } catch (e) {
        failures++;
        console.error(`ERR ${chat.id} ${chat.title}: ${e.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
  await save();

  const done = all.filter((ch) => ch.summary).length;
  console.log(`\n${done}/${all.length} chats have summaries → ${OUT}`);
  if (failures) {
    console.error(`${failures} failed; re-run to fill the gaps.`);
    process.exit(1);
  }
}

main();
