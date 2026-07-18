import { createClient } from '@supabase/supabase-js';
const cli=createClient('https://dofbxgqzcvfjpnvcvdjb.supabase.co','sb_publishable_gPwLXkMHk3HvFz9nm9hgKA_1D0IJBKA');
await cli.auth.signInWithPassword({email:'qa.canchero.test@gmail.com',password:'QaCanchero2026!'});
const r=await cli.rpc('redeem_business_code',{p_code:'CAN-PRSL-W9LA'});
console.log('redeem (QA, esperado invalid sin error SQL):', r.error? ('ERROR: '+r.error.message) : r.data);
process.exit(0);
