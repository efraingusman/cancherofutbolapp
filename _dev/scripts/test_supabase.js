const SUPABASE_URL = 'https://dofbxgqzcvfjpnvcvdjb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gPwLXkMHk3HvFz9nm9hgKA_1D0IJBKA';

async function testSupabase() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/complexes?select=*&limit=1`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (response.ok) {
            console.log('SUCCESS: La tabla complexes existe y responde correctamente.');
        } else {
            const err = await response.text();
            console.log('ERROR:', response.status, err);
        }
    } catch (e) {
        console.log('FETCH EXCEPTION:', e);
    }
}

testSupabase();
