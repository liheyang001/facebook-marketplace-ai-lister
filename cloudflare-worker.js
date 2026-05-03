// Cloudflare Worker — Gemini API proxy
// Environment variables to set in Cloudflare dashboard:
//   GEMINI_KEY      → your Gemini API key
//   EXTENSION_SECRET → any random string, same as in popup.js

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Secret',
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Prevent casual abuse — extension sends a shared secret
    if (request.headers.get('X-Extension-Secret') !== env.EXTENSION_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Rate limit: max 20 requests per IP per day
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `rl:${ip}:${new Date().toISOString().slice(0, 10)}`;
    const current = parseInt(await env.RATE_LIMIT.get(rateLimitKey) || '0');
    if (current >= 20) {
      return new Response('Rate limit exceeded (20/day per IP)', { status: 429 });
    }
    await env.RATE_LIMIT.put(rateLimitKey, String(current + 1), { expirationTtl: 86400 });

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await geminiRes.json();

    return new Response(JSON.stringify(data), {
      status: geminiRes.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};
