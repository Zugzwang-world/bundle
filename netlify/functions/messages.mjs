// Server-side proxy for the Messages API. The key lives in the ANTHROPIC_API_KEY
// environment variable on Netlify and never reaches the browser.
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: { message: 'ANTHROPIC_API_KEY is not set on the server.' } }, { status: 500 });
  const body = await req.text();
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body,
  });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'content-type': 'application/json' },
  });
};

export const config = { path: '/api/messages' };
