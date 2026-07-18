/**
 * SMOKE TEST pre-deploy — correr SIEMPRE antes de `vercel deploy`:
 *   node _dev/smoke.mjs
 * Valida (con el usuario QA real bajo RLS):
 *   1. Login con email/contraseña (Supabase Auth)
 *   2. Lectura del feed (posts) y perfiles (users)
 *   3. Like a post ajeno + trigger de likes_count
 *   4. Crear partido propio, unirse, trigger slots_taken, borrar
 *   5. Enviar DM y leerlo; DMs ajenos invisibles
 *   6. Escrituras maliciosas bloqueadas (editar post/partido/perfil ajeno)
 * Sale con código 1 si algo falla (sirve para encadenar en el deploy).
 */
import { createClient } from '@supabase/supabase-js';

const URL = 'https://dofbxgqzcvfjpnvcvdjb.supabase.co';
const PUB = 'sb_publishable_gPwLXkMHk3HvFz9nm9hgKA_1D0IJBKA';
const QA = 'qa.canchero.test@gmail.com', PASS = 'QaCanchero2026!';

let fails = 0;
const check = (name, ok, extra='') => {
  console.log((ok ? '✅' : '❌'), name, extra);
  if (!ok) fails++;
};

const cli = createClient(URL, PUB);

// 1. login
const si = await cli.auth.signInWithPassword({ email: QA, password: PASS });
check('login QA', !si.error, si.error?.message || '');
if (si.error) process.exit(1);

// 2. feed + perfiles
const feed = await cli.from('posts').select('id,user_email,likes_count').order('created_at', { ascending: false }).limit(5);
check('leer feed', !feed.error && feed.data.length >= 0, feed.error?.message || `${feed.data?.length} posts`);
const prof = await cli.from('users').select('email,name').limit(3);
check('leer perfiles', !prof.error && prof.data.length > 0);

// 3. like ajeno + trigger
const target = (feed.data || []).find(p => p.user_email !== QA);
if (target) {
  await cli.from('post_likes').delete().eq('post_id', target.id).eq('user_email', QA);
  const before = (await cli.from('posts').select('likes_count').eq('id', target.id).single()).data.likes_count || 0;
  const lk = await cli.from('post_likes').insert({ post_id: target.id, user_email: QA, user_name: 'QA Test' });
  await new Promise(r => setTimeout(r, 900));
  const after = (await cli.from('posts').select('likes_count').eq('id', target.id).single()).data.likes_count || 0;
  check('like ajeno + trigger', !lk.error && after === before + 1, `${before}→${after}`);
  await cli.from('post_likes').delete().eq('post_id', target.id).eq('user_email', QA);
}

// 4. partido propio + join + trigger slots + delete
const m = await cli.from('matches').insert({
  name: 'SMOKE 5v5', match_type: 'abierto', modality: 'abierto', created_by: QA,
  captain_home_email: QA, scheduled_at: new Date(Date.now() + 864e5).toISOString(),
  slots_total: 10, slots_taken: 0, city: 'QA'
}).select('id').single();
check('crear partido', !m.error, m.error?.message || '');
if (m.data) {
  const jp = await cli.from('match_players').insert({ match_id: m.data.id, player_email: QA, player_name: 'QA', team: 'home', position: 'DEL', status: 'confirmado' });
  await new Promise(r => setTimeout(r, 700));
  const slots = (await cli.from('matches').select('slots_taken').eq('id', m.data.id).single()).data.slots_taken;
  check('join + trigger slots', !jp.error && slots === 1, `slots=${slots}`);
  const del = await cli.from('matches').delete().eq('id', m.data.id);
  check('borrar mi partido', !del.error);
}

// 5. DMs
const dm = await cli.from('messages').insert({ sender_email: QA, recipient_email: 'joelviettro@gmail.com', content: 'smoke ' + Date.now() });
check('enviar DM', !dm.error, dm.error?.message || '');
const mine = await cli.from('messages').select('id').eq('sender_email', QA).limit(1);
check('leer mis DMs', !mine.error && mine.data.length > 0);
const ajenos = await cli.from('messages').select('id').eq('sender_email', 'almironrod69@gmail.com').limit(1);
check('DMs ajenos invisibles', !ajenos.error && ajenos.data.length === 0);

// 6. escrituras maliciosas
const h1 = await cli.from('posts').update({ content: 'HACK' }).neq('user_email', QA).select();
check('editar post ajeno bloqueado', (h1.data || []).length === 0);
const h2 = await cli.from('matches').update({ name: 'HACK' }).neq('created_by', QA).select();
check('editar partido ajeno bloqueado', (h2.data || []).length === 0);
const h3 = await cli.from('users').update({ name: 'HACK' }).neq('email', QA).select();
check('editar perfil ajeno bloqueado', (h3.data || []).length === 0);
const h4 = await cli.from('messages').insert({ sender_email: 'almironrod69@gmail.com', recipient_email: QA, content: 'spoof' });
check('DM spoofeado bloqueado', !!h4.error);

await cli.auth.signOut();
console.log(fails ? `\n💥 ${fails} CHECKS FALLARON — NO DEPLOYAR` : '\n🟢 SMOKE OK — listo para deployar');
process.exit(fails ? 1 : 0);
