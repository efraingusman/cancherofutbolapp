import { createClient } from '@supabase/supabase-js';
const cli=createClient('https://dofbxgqzcvfjpnvcvdjb.supabase.co','sb_publishable_gPwLXkMHk3HvFz9nm9hgKA_1D0IJBKA');
await cli.auth.signInWithPassword({email:'qa.canchero.test@gmail.com',password:'QaCanchero2026!'});
const r=await cli.from('push_subscriptions').upsert({user_email:'qa.canchero.test@gmail.com',endpoint:'https://qa.test/ep',sub_json:{qa:1}},{onConflict:'user_email'});
console.log('push propia:', r.error?r.error.message:'ok');
const r2=await cli.from('push_subscriptions').insert({user_email:'joelviettro@gmail.com',endpoint:'https://spoof',sub_json:{}});
console.log('push ajena (esperado error):', r2.error?r2.error.message:'INSERTÓ (MAL)');
process.exit(0);
