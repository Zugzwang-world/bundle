// Thin fetch wrapper for the Messages API.
// Two modes: 'direct' (a VITE_ANTHROPIC_API_KEY in .env — local dev only, the key is inlined)
// or 'proxy' (the deployed site — /api/messages is a Netlify function that holds the key).
// Every call returns { output, raw: { request, response }, ms } so the stage view can show it.
const DIRECT_URL = 'https://api.anthropic.com/v1/messages';
const PROXY_URL = '/api/messages';

// Only these exact property reads are replaced by Vite at build time. Never read
// import.meta.env as a whole object: Vite would inline every VITE_* value, key included.
function readEnv(read) {
  try { return read() || ''; } catch { return ''; } // undefined outside Vite (smoke/tests)
}
// Node fallback (scripts, smoke runs with `node --env-file=.env`): process.env is undefined in
// the browser, so the typeof guard keeps this a no-op under Vite.
const nodeEnv = (name) =>
  (typeof process !== 'undefined' && process.env && process.env[name]) || '';
const localKey = readEnv(() => import.meta.env.VITE_ANTHROPIC_API_KEY) || nodeEnv('VITE_ANTHROPIC_API_KEY');
export const config = {
  apiKey: localKey,
  model: readEnv(() => import.meta.env.VITE_MODEL) || nodeEnv('VITE_MODEL') || 'claude-fable-5-1',
  mode: localKey ? 'direct' : 'proxy',
};

// The composer is always enabled: direct mode has a key, proxy mode defers to the server.
export const hasKey = () => true;

async function post(body) {
  const t0 = performance.now();
  const direct = config.mode === 'direct';
  const res = await fetch(direct ? DIRECT_URL : PROXY_URL, {
    method: 'POST',
    headers: direct
      ? {
          'content-type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        }
      : { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const ms = Math.round(performance.now() - t0);
  if (!res.ok) throw new Error(json?.error?.message || `API error ${res.status}`);
  return { json, ms, request: body };
}

// Plain text reply.
export async function complete({ system, messages, max_tokens = 2000 }) {
  const { json, ms, request } = await post({ model: config.model, max_tokens, system, messages });
  const text = (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { output: text, usage: json.usage, ms, raw: { request, response: json } };
}

// JSON via a single tool. claude-fable-5-1 rejects tool_choice {type:"tool"}, so the tool is
// offered with "auto" and the system prompt requires it; if the model answers in text instead,
// the first JSON object in that text is parsed as a fallback.
export async function forcedJson({ system, messages, tool, max_tokens = 1500 }) {
  const { json, ms, request } = await post({
    model: config.model,
    max_tokens,
    system: `${system}\n\nYou must respond by calling the ${tool.name} tool exactly once. Do not answer in prose.`,
    messages,
    tools: [tool],
    tool_choice: { type: 'auto' },
  });
  const use = (json.content || []).find((b) => b.type === 'tool_use' && b.name === tool.name);
  if (use) return { output: use.input, usage: json.usage, ms, raw: { request, response: json } };
  const text = (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`Model did not call ${tool.name}`);
  return { output: JSON.parse(m[0]), usage: json.usage, ms, raw: { request, response: json } };
}
