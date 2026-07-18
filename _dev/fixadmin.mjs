import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const SEC=fs.readFileSync(process.env.TEMP+'/sbsec2.txt','utf8').trim();
const admin=createClient('https://dofbxgqzcvfjpnvcvdjb.supabase.co',SEC);
const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
const u = list.users.find(x=>x.email==='neurovidstudioia@gmail.com');
if(!u){ console.log('no encontrado'); process.exit(1); }
const { error } = await admin.auth.admin.updateUserById(u.id, { password:'canchero2026', email_confirm:true });
console.log('updatePassword:', error? error.message:'ok');
const cli=createClient('https://dofbxgqzcvfjpnvcvdjb.supabase.co','sb_publishable_gPwLXkMHk3HvFz9nm9hgKA_1D0IJBKA');
const si=await cli.auth.signInWithPassword({email:'neurovidstudioia@gmail.com',password:'canchero2026'});
console.log('signIn admin:', si.error? si.error.message:'ok');
const br=await cli.from('business_requests').select('email,name,status,approval_code').order('created_at',{ascending:false}).limit(5);
console.log('solicitudes:', br.error? br.error.message : JSON.stringify(br.data));
process.exit(0);
