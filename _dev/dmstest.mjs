import { createClient } from '@supabase/supabase-js';
const URL='https://dofbxgqzcvfjpnvcvdjb.supabase.co', PUB='sb_publishable_gPwLXkMHk3HvFz9nm9hgKA_1D0IJBKA';
const cli=createClient(URL,PUB);
await cli.auth.signInWithPassword({email:'qa.canchero.test@gmail.com',password:'QaCanchero2026!'});
const QA='qa.canchero.test@gmail.com', OTRO='almironrod69@gmail.com';
// limpiar thread previo con OTRO
await cli.from('messages').delete().eq('sender_email',QA).eq('recipient_email',OTRO);
await cli.from('dm_threads').delete().or(`user_a.eq.${QA},user_b.eq.${QA}`).or(`user_a.eq.${OTRO},user_b.eq.${OTRO}`);
const ok=(n,v,extra='')=>console.log(v?'✅':'❌',n,extra);
// 1) primer mensaje a desconocido → thread request
const m1=await cli.from('messages').insert({sender_email:QA,recipient_email:OTRO,content:'hola, ¿jugás mañana?'});
ok('1er msj a desconocido permitido', !m1.error, m1.error?.message||'');
await new Promise(r=>setTimeout(r,600));
const th=await cli.from('dm_threads').select('*').or(`user_a.eq.${QA},user_b.eq.${QA}`).limit(5);
const t=(th.data||[]).find(x=>[x.user_a,x.user_b].includes(OTRO));
ok('thread creado como request', t && t.status==='request', t?t.status:'sin thread');
// 2) segundo mensaje bloqueado mientras es request
const m2=await cli.from('messages').insert({sender_email:QA,recipient_email:OTRO,content:'spam 2'});
ok('2do msj bloqueado (1 por solicitud)', !!m2.error, m2.error?.message?.slice(0,50)||'PASÓ (mal)');
// 3) thread con Efrain (histórico) sigue accepted
const th2=await cli.from('dm_threads').select('status').or(`user_a.eq.${QA},user_b.eq.${QA}`);
const acc=(th2.data||[]).some(x=>x.status==='accepted');
ok('backfill: chats viejos accepted', acc);
// 4) dm_privacy nadie bloquea (lo probamos contra el QA mismo cambiando su propia privacy y enviando desde... no hay 2do user fácil; validar can_dm rpc)
const cd=await cli.rpc('can_dm',{recipient:OTRO});
ok('can_dm responde', !cd.error, String(cd.data));
process.exit(0);
