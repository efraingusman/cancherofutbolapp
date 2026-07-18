// supabase/functions/send-push/index.ts
// Edge Function que envía Web Push a los dispositivos suscriptos cuando
// se crea una notificación. Se invoca desde un Database Webhook (trigger)
// sobre INSERT en la tabla `notifications`.
//
// Deploy:
//   supabase functions deploy send-push --no-verify-jwt
//   supabase secrets set VAPID_PUBLIC_KEY=BBroCsoWU_7LaFpLJJl2wpfQJObsyJPfXzLPwS-q1_udi4jMe7kSU4JVM6-bOCA5V87DksjRa7gtd7HIL5bW5Zc
//   supabase secrets set VAPID_PRIVATE_KEY=NP-4zptQj12w8rBfXjbu4Zca4KQ34n4i5lVQD8bTkXs
//   supabase secrets set VAPID_SUBJECT=mailto:neurostudio.uy@gmail.com
//
// Luego creá un Database Webhook (Dashboard → Database → Webhooks):
//   Tabla: notifications · Evento: INSERT · Tipo: Supabase Edge Function → send-push

import webpush from 'https://esm.sh/web-push@3.6.7';

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:neurostudio.uy@gmail.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

async function getSubs(email: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?user_email=eq.${encodeURIComponent(email)}`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
  return await r.json();
}

async function delSub(endpoint: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    // El webhook manda { type:'INSERT', record:{...} }
    const n = body.record || body;
    const email = n.recipient_email || n.user_email;
    if (!email) return new Response('no recipient', { status: 200 });

    const subs = await getSubs(email);
    if (!Array.isArray(subs) || !subs.length) return new Response('no subs', { status: 200 });

    const titleByType: Record<string, string> = {
      dm: '💬 Nuevo mensaje', like: '❤️ Nuevo like', comment: '💬 Nuevo comentario',
      follow: '➕ Nuevo seguidor', chicana: '⚡ Te mandaron una chicana', achievement: '🏆 Logro desbloqueado',
    };
    const payload = JSON.stringify({
      title: titleByType[n.type] || 'Canchero',
      body: n.message || (n.actor_name ? `${n.actor_name}…` : 'Tenés una novedad'),
      icon: '/logo-oficial.png',
      url: 'https://canchero-app.vercel.app/#jugador',
      // datos para deep-link en el cliente
      data: { type: n.type, actor_email: n.actor_email, post_id: n.post_id, match_id: n.match_id, actor_name: n.actor_name },
    });

    await Promise.all(subs.map(async (s: any) => {
      try {
        const sub = JSON.parse(s.sub_json);
        await webpush.sendNotification(sub, payload);
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) await delSub(s.endpoint);
      }
    }));

    return new Response('ok', { status: 200 });
  } catch (e) {
    return new Response(`err: ${e}`, { status: 200 });
  }
});
