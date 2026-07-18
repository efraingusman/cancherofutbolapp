// run-sql.mjs — Ejecuta el SQL de Fase 3 en Supabase
// Uso: node run-sql.mjs TU_PERSONAL_ACCESS_TOKEN
//
// Obtene tu token en: https://supabase.com/dashboard/account/tokens
// Hace clic en "Generate new token", dale un nombre, copialo y pega aqui.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const PAT = process.argv[2];
const PROJECT_REF = 'dofbxgqzcvfjpnvcvdjb';
const __dir = dirname(fileURLToPath(import.meta.url));

if (!PAT) {
  console.log('\n❌ Falta el Personal Access Token.');
  console.log('Uso: node run-sql.mjs TU_TOKEN_AQUI\n');
  console.log('Obtene tu token en: https://supabase.com/dashboard/account/tokens\n');
  process.exit(1);
}

// SQL a ejecutar (solo las partes que pueden faltar)
const SQL_STATEMENTS = [
  // Tabla stories con expires_at para 12hs
  `CREATE TABLE IF NOT EXISTS public.stories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email text NOT NULL,
    user_name text,
    user_role text DEFAULT 'jugador',
    user_avatar text,
    content text,
    media_url text,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours'),
    created_at timestamptz DEFAULT now()
  )`,
  `ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "stories_public_read" ON public.stories`,
  `DROP POLICY IF EXISTS "stories_own" ON public.stories`,
  `CREATE POLICY "stories_public_read" ON public.stories FOR SELECT USING (true)`,
  `CREATE POLICY "stories_own" ON public.stories FOR ALL USING (auth.email() = user_email)`,
  `GRANT SELECT ON public.stories TO anon`,
  `GRANT ALL ON public.stories TO authenticated`,
  `ALTER PUBLICATION supabase_realtime ADD TABLE public.stories`,

  // Fix permisos en tablas existentes
  `GRANT SELECT ON public.matches TO anon, authenticated`,
  `GRANT SELECT ON public.predictions TO anon, authenticated`,
  `GRANT SELECT ON public.posts TO anon, authenticated`,
  `GRANT INSERT ON public.posts TO authenticated`,
  `GRANT DELETE ON public.posts TO authenticated`,
  `GRANT INSERT ON public.predictions TO authenticated`,
  `GRANT INSERT, UPDATE ON public.matches TO authenticated`,

  // Tablas nuevas
  `CREATE TABLE IF NOT EXISTS public.match_checkins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid,
    user_email text NOT NULL,
    checked_in_at timestamptz DEFAULT now(),
    UNIQUE(match_id, user_email)
  )`,
  `ALTER TABLE public.match_checkins ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "checkin_own" ON public.match_checkins`,
  `CREATE POLICY "checkin_own" ON public.match_checkins FOR ALL USING (auth.email() = user_email)`,
  `GRANT ALL ON public.match_checkins TO authenticated`,
  `GRANT SELECT ON public.match_checkins TO anon`,

  `CREATE TABLE IF NOT EXISTS public.squad_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid,
    captain_email text NOT NULL,
    missing_count integer DEFAULT 1,
    city text,
    status text DEFAULT 'open',
    created_at timestamptz DEFAULT now()
  )`,
  `ALTER TABLE public.squad_requests ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "squad_req_read" ON public.squad_requests`,
  `DROP POLICY IF EXISTS "squad_req_captain" ON public.squad_requests`,
  `CREATE POLICY "squad_req_read" ON public.squad_requests FOR SELECT USING (true)`,
  `CREATE POLICY "squad_req_captain" ON public.squad_requests FOR ALL USING (auth.email() = captain_email)`,
  `GRANT ALL ON public.squad_requests TO authenticated`,
  `GRANT SELECT ON public.squad_requests TO anon`,

  `CREATE TABLE IF NOT EXISTS public.squad_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid,
    applicant_email text NOT NULL,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    UNIQUE(request_id, applicant_email)
  )`,
  `ALTER TABLE public.squad_applications ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "squad_app_applicant" ON public.squad_applications`,
  `DROP POLICY IF EXISTS "squad_app_read" ON public.squad_applications`,
  `CREATE POLICY "squad_app_applicant" ON public.squad_applications FOR ALL USING (auth.email() = applicant_email)`,
  `CREATE POLICY "squad_app_read" ON public.squad_applications FOR SELECT USING (true)`,
  `GRANT ALL ON public.squad_applications TO authenticated`,
  `GRANT SELECT ON public.squad_applications TO anon`,

  `CREATE TABLE IF NOT EXISTS public.live_streams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    streamer_email text NOT NULL,
    streamer_name text,
    match_id uuid,
    tags text[],
    status text DEFAULT 'live',
    viewer_count integer DEFAULT 0,
    started_at timestamptz DEFAULT now(),
    ended_at timestamptz
  )`,
  `ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "streams_public_read" ON public.live_streams`,
  `DROP POLICY IF EXISTS "streams_streamer" ON public.live_streams`,
  `CREATE POLICY "streams_public_read" ON public.live_streams FOR SELECT USING (true)`,
  `CREATE POLICY "streams_streamer" ON public.live_streams FOR ALL USING (auth.email() = streamer_email)`,
  `GRANT ALL ON public.live_streams TO authenticated`,
  `GRANT SELECT ON public.live_streams TO anon`,

  `CREATE TABLE IF NOT EXISTS public.party_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid,
    user_email text NOT NULL,
    user_name text,
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
  )`,
  `ALTER TABLE public.party_messages ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "pm_read" ON public.party_messages`,
  `DROP POLICY IF EXISTS "pm_insert" ON public.party_messages`,
  `CREATE POLICY "pm_read" ON public.party_messages FOR SELECT USING (true)`,
  `CREATE POLICY "pm_insert" ON public.party_messages FOR INSERT WITH CHECK (auth.email() = user_email)`,
  `GRANT ALL ON public.party_messages TO authenticated`,
  `GRANT SELECT ON public.party_messages TO anon`,

  `CREATE TABLE IF NOT EXISTS public.blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_email text NOT NULL,
    blocked_email text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(blocker_email, blocked_email)
  )`,
  `ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "blocks_own" ON public.blocks`,
  `CREATE POLICY "blocks_own" ON public.blocks FOR ALL USING (auth.email() = blocker_email)`,
  `GRANT ALL ON public.blocks TO authenticated`,

  // Realtime
  `ALTER PUBLICATION supabase_realtime ADD TABLE public.party_messages`,
  `ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams`,
  `ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_requests`,

  // Storage bucket media
  `INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT (id) DO UPDATE SET public = true`,
  `DROP POLICY IF EXISTS "media_public_read" ON storage.objects`,
  `DROP POLICY IF EXISTS "media_auth_upload" ON storage.objects`,
  `CREATE POLICY "media_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'media')`,
  `CREATE POLICY "media_auth_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated')`,
];

async function runQuery(sql) {
  const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, body };
}

console.log(`\n🚀 Ejecutando ${SQL_STATEMENTS.length} sentencias SQL en Supabase...\n`);

let ok = 0, skip = 0, fail = 0;
for (let i = 0; i < SQL_STATEMENTS.length; i++) {
  const sql = SQL_STATEMENTS[i];
  const preview = sql.trim().split('\n')[0].slice(0, 60);
  const result = await runQuery(sql);
  if (result.ok) {
    console.log(`  ✅ [${i+1}/${SQL_STATEMENTS.length}] ${preview}`);
    ok++;
  } else {
    const msg = result.body?.message || result.body?.error || JSON.stringify(result.body).slice(0, 80);
    // Some "errors" are expected (already exists, etc.)
    if (msg.includes('already exists') || msg.includes('duplicate') || result.status === 409) {
      console.log(`  ⏭️  [${i+1}/${SQL_STATEMENTS.length}] ${preview} (ya existe)`);
      skip++;
    } else {
      console.log(`  ❌ [${i+1}/${SQL_STATEMENTS.length}] ${preview}`);
      console.log(`     Error: ${msg}`);
      fail++;
    }
  }
}

console.log(`\n📊 Resultado: ${ok} exitosos, ${skip} omitidos (ya existian), ${fail} con error\n`);

if (fail === 0) {
  console.log('✅ Todo listo! Las tablas de Fase 3 estan configuradas.\n');
} else {
  console.log('⚠️  Algunos pasos fallaron. Revisa los errores arriba.\n');
}
