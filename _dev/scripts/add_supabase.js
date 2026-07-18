const fs = require('fs');
const path = 'c:/Users/Cliente/Documents/canchero app/script.js';
let c = fs.readFileSync(path, 'utf-8');

const supabaseInit = `
// ============================================================
// SUPABASE BACKEND INTEGRATION
// ============================================================
const SUPABASE_URL = 'https://dofbxgqzcvfjpnvcvdjb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gPwLXkMHk3HvFz9nm9hgKA_1D0IJBKA';
let supabase = null;
try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("Supabase inicializado correctamente.");
    }
} catch(e) {
    console.warn("Error inicializando Supabase:", e);
}

`;

if (!c.includes('SUPABASE_URL')) {
    // Insert after "const roles = ['jugador', 'club'];"
    const targetInit = `const roles = ['jugador', 'club'];`;
    c = c.replace(targetInit, targetInit + '\n' + supabaseInit);
}

// Now replace the pipeline save in handleRegister with a Supabase sync
const pipelineTarget = `        localStorage.setItem('canchero_complexes', JSON.stringify(allComplexes));`;
const pipelineSupabase = `        localStorage.setItem('canchero_complexes', JSON.stringify(allComplexes));
        
        // Sincronizar con Supabase (en segundo plano)
        if (supabase) {
            supabase.from('complexes').insert([{
                id: 'comp_' + Date.now(),
                name: userData.complexData ? userData.complexData.complexName : '',
                owner: userData.complexData ? userData.complexData.owner : '',
                email: userData.email,
                phone: document.getElementById('reg-phone') ? document.getElementById('reg-phone').value : '',
                rut: userData.complexData ? userData.complexData.rut : '',
                status: 'PENDIENTE',
                date: new Date().toISOString(),
                payload: JSON.stringify(userData)
            }]).then(({data, error}) => {
                if(error) console.warn("Supabase (complexes) no esta configurado aun. Por favor crea la tabla 'complexes' con los campos correctos.", error);
                else console.log("Guardado en nube exitoso.");
            });
            
            supabase.from('users').insert([{
                email: userData.email,
                name: userData.complexData ? userData.complexData.complexName : '',
                role: 'club',
                created_at: new Date().toISOString()
            }]).then(({error}) => {
                if(error) console.warn("Supabase (users) error:", error);
            });
        }
`;

if (c.includes(pipelineTarget) && !c.includes("supabase.from('complexes')")) {
    c = c.replace(pipelineTarget, pipelineSupabase);
}

fs.writeFileSync(path, c, 'utf-8');
console.log('Supabase integration added successfully.');
