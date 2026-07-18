import { createClient } from '@supabase/supabase-js';
const URL='https://dofbxgqzcvfjpnvcvdjb.supabase.co', PUB='sb_publishable_gPwLXkMHk3HvFz9nm9hgKA_1D0IJBKA';
const cli=createClient(URL,PUB);
// el negocio hijitosuy probablemente no tiene auth user/contraseña conocida — probamos el RPC con un usuario que sí controlamos: simulamos validación del código
// Validar que redeem rechaza código equivocado y acepta el correcto requiere sesión del negocio.
// En su lugar verificamos la lógica del RPC vía el QA (que NO tiene solicitud) → debe dar invalid
await cli.auth.signInWithPassword({email:'qa.canchero.test@gmail.com',password:'QaCanchero2026!'});
const r1=await cli.rpc('redeem_business_code',{p_code:'CAN-PRSL-W9LA'});
console.log('QA canjea codigo ajeno (esperado invalid):', r1.error?r1.error.message:r1.data);
const r2=await cli.rpc('redeem_business_code',{p_code:'XX-NOEXISTE'});
console.log('codigo inexistente (esperado invalid):', r2.error?r2.error.message:r2.data);
process.exit(0);
