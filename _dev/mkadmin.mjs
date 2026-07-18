import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const SEC=fs.readFileSync(process.env.TEMP+'/sbsec2.txt','utf8').trim();
const admin=createClient('https://dofbxgqzcvfjpnvcvdjb.supabase.co',SEC);
const { data, error } = await admin.auth.admin.createUser({ email:'neurovidstudioia@gmail.com', password:'canchero2026', email_confirm:true });
console.log('createUser:', error? error.message : 'ok');
// probar login real + lectura de solicitudes como admin
const cli=createClient('https://dofbxgqzcvfjpnvcvdjb.supabase.co','sb_publishable_gPwLXkMHk3HvFz9nm9hgKA_1D0IJBKA');
const si=await cli.auth.signInWithPassword({email:'neurovidstudioia@gmail.com',password:'canchero2026'});
console.log('signIn admin:', si.error? si.error.message:'ok');
const br=await cli.from('business_requests').select('email,name,status').order('created_at',{ascending:false}).limit(5);
console.log('solicitudes visibles:', br.error? br.error.message : br.data.map(r=>r.name+' ('+r.status+')').join(' | '));
process.exit(0);
