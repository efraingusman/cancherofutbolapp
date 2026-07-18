// Supabase Edge Function: push-notifications
// Se activa via Database Webhook en INSERT de tabla `notifications`
// Usa tabla `push_subscriptions` (ya existente) con columnas: user_email, endpoint, sub_json
// Deno runtime — Web Push VAPID sin Firebase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL     = Deno.env.get('SUPABASE_URL')!;
const SB_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUB  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIV = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUB  = Deno.env.get('VAPID_SUBJECT') || 'mailto:neurostudio.uy@gmail.com';

const sb = createClient(SB_URL, SB_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────

function b64url(arr: Uint8Array): string {
  let s = '';
  arr.forEach(b => s += String.fromCharCode(b));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromB64url(s: string): Uint8Array {
  const p = '='.repeat((4 - s.length % 4) % 4);
  const b = (s + p).replace(/-/g, '+').replace(/_/g, '/');
  const r = atob(b);
  const a = new Uint8Array(r.length);
  for (let i = 0; i < r.length; i++) a[i] = r.charCodeAt(i);
  return a;
}

async function makeVapidHeader(audience: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header  = b64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: VAPID_SUB })));
  const msg = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    'pkcs8', fromB64url(VAPID_PRIV),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(msg));
  return `vapid t=${msg}.${b64url(new Uint8Array(sig))},k=${VAPID_PUB}`;
}

async function sendPush(subJson: string, title: string, body: string): Promise<void> {
  const sub = JSON.parse(subJson);
  const endpoint = sub.endpoint;
  const u = new URL(endpoint);
  const vapid = await makeVapidHeader(`${u.protocol}//${u.host}`);

  // Payload como texto plano (sin encriptación para máxima compatibilidad)
  const payloadStr = JSON.stringify({ title, body, icon: '/logo-oficial.png', url: 'https://canchero-app.vercel.app' });
  const payloadBytes = new TextEncoder().encode(payloadStr);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': vapid,
      'TTL': '86400',
    },
    body: payloadBytes,
  });

  if (!res.ok && res.status !== 201) {
    const txt = await res.text().catch(() => '');
    console.warn(`[push] ${res.status} for ${endpoint}: ${txt}`);
    // Si 410 Gone = suscripción expirada, borrarla
    if (res.status === 410) {
      await sb.from('push_subscriptions').delete().eq('endpoint', endpoint);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body: { record?: { recipient_email?: string; message?: string; actor_name?: string; type?: string } };
  try { body = await req.json(); } catch { return new Response('Bad request', { status: 400 }); }

  const notif = body.record;
  if (!notif?.recipient_email) return new Response('No data', { status: 200 });

  // Buscar suscripciones del receptor en push_subscriptions (tabla ya existente)
  const { data: subs } = await sb
    .from('push_subscriptions')
    .select('sub_json, endpoint')
    .eq('user_email', notif.recipient_email);

  if (!subs || subs.length === 0) return new Response('No subscriptions', { status: 200 });

  const typeLabels: Record<string, string> = {
    dm: '💬 Mensaje nuevo', like: '❤️ Le gustó tu publicación',
    comment: '💬 Comentó tu publicación', follow: '👤 Nuevo seguidor',
    story: '📷 Historia nueva', story_reply: '💬 Respondió tu historia', group: '👥 Mensaje en grupo',
  };

  const title = typeLabels[notif.type || ''] || '🟢 Canchero';
  const msgBody = notif.message || 'Nueva notificación';

  await Promise.allSettled(subs.map(s => sendPush(s.sub_json, title, msgBody)));

  return new Response(JSON.stringify({ ok: true, sent: subs.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
