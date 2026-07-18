import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const SEC=fs.readFileSync(process.env.TEMP+'/sbsec2.txt','utf8').trim();
const admin=createClient('https://dofbxgqzcvfjpnvcvdjb.supabase.co',SEC);
const { data, error } = await admin.from('users')
  .select('email,name,role,sub_status,city,department,price_info,cover_photo,photo')
  .in('role',['club','complejo']);
console.log('ERROR:', error&&error.message);
console.log('NEGOCIOS club/complejo:');
(data||[]).forEach(u=>console.log(' -', u.email, '| name:',u.name,'| role:',u.role,'| sub_status:',u.sub_status,'| city:',u.city,'| dept:',u.department));
const { data:qa } = await admin.from('users').select('email,name,role,sub_status').ilike('name','%QA%');
console.log('\nFilas con QA en el nombre:', JSON.stringify(qa));
process.exit(0);
