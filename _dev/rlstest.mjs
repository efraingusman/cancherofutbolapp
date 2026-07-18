import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const URL='https://dofbxgqzcvfjpnvcvdjb.supabase.co';
const PUB='sb_publishable_gPwLXkMHk3HvFz9nm9hgKA_1D0IJBKA';
const SEC=fs.readFileSync(process.env.TEMP+'/sbsec2.txt','utf8').trim();
const admin=createClient(URL,SEC);
const out=(n,v)=>console.log(n.padEnd(38),JSON.stringify(v).slice(0,120));

// 1) crear/asegurar usuario de prueba
const TEST='qa.canchero.test@gmail.com', PASS='QaCanchero2026!';
let { data:cu, error:ce } = await admin.auth.admin.createUser({ email:TEST, password:PASS, email_confirm:true });
out('createUser', ce ? ce.message : 'ok');

// 2) anon: leer users (perfil público) y messages (debe dar 0 filas)
const anon=createClient(URL,PUB);
out('anon users select', (await anon.from('users').select('email').limit(2)).data?.length);
const am=await anon.from('messages').select('id').limit(5);
out('anon messages select (esperado 0)', am.error? am.error.message : am.data.length);
const aw=await anon.from('users').update({name:'HACKED'}).eq('email','joelviettro@gmail.com').select();
out('anon update user ajeno (esperado 0)', aw.error? aw.error.message : aw.data.length);

// 3) sesión real del test user
const cli=createClient(URL,PUB);
const si=await cli.auth.signInWithPassword({email:TEST,password:PASS});
out('signIn test user', si.error? si.error.message : 'ok');
out('insert mi fila users', (await cli.from('users').upsert({email:TEST,name:'QA Test',role:'jugador'},{onConflict:'email'})).error?.message||'ok');
out('update mi user', (await cli.from('users').update({bio:'qa'}).eq('email',TEST)).error?.message||'ok');
const upd2=await cli.from('users').update({name:'HACK2'}).eq('email','joelviettro@gmail.com').select();
out('update user ajeno (esperado 0 filas)', upd2.error? upd2.error.message : upd2.data.length);
// mensajes: enviar como yo a Efrain, leer, y verificar que NO leo DMs ajenos
out('dm insert mio', (await cli.from('messages').insert({sender_email:TEST,recipient_email:'joelviettro@gmail.com',content:'hola QA'})).error?.message||'ok');
out('dm insert spoofeado (esperado error)', (await cli.from('messages').insert({sender_email:'almironrod69@gmail.com',recipient_email:'joelviettro@gmail.com',content:'spoof'})).error?.message||'INSERTÓ (MAL)');
const myDm=await cli.from('messages').select('id').or(`sender_email.eq.${TEST},recipient_email.eq.${TEST}`).limit(5);
out('dm select mios', myDm.error? myDm.error.message : myDm.data.length);
const ajeno=await cli.from('messages').select('id').eq('sender_email','almironrod69@gmail.com').limit(5);
out('dm select ajenos (esperado 0)', ajeno.error? ajeno.error.message : ajeno.data.length);
// notifications: crear hacia otro, leer las mías
out('notif insert hacia otro', (await cli.from('notifications').insert({recipient_email:'joelviettro@gmail.com',type:'like',actor_email:TEST,actor_name:'QA',message:'qa notif',read:false})).error?.message||'ok');
const mn=await cli.from('notifications').select('id').limit(3);
out('notif select (solo mias)', mn.error? mn.error.message : mn.data.length);
// group_members recursion check
const gm=await cli.from('group_members').select('id').limit(3);
out('group_members select (sin recursion)', gm.error? gm.error.message : gm.data.length);
const gmsg=await cli.from('group_messages').select('id').limit(3);
out('group_messages select', gmsg.error? gmsg.error.message : gmsg.data.length);
// push sub propia
out('push_sub propia', (await cli.from('push_subscriptions').upsert({user_email:TEST,subscription:{qa:1}},{onConflict:'user_email'})).error?.message||'ok');
process.exit(0);
