-- ════════════════════════════════════════════════════════════════════
-- RLS FASE 5 — TANDA D: CRMs de negocios + misceláneas (2026-06-11)
-- Cierra las últimas tablas con políticas "ALL USING true".
-- business_email = dueño del negocio · client_email = cliente participante.
-- ════════════════════════════════════════════════════════════════════

do $$
declare r record;
begin
  for r in select tablename, policyname from pg_policies
    where schemaname='public' and tablename in
    ('admin_agenda','business_appointments','business_chatbot_faq','business_client_payments',
     'business_courts','business_employees','business_orders','business_products',
     'business_requests','business_reservations','business_reviews','business_services',
     'player_achievements','achievements','bots','complexes')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ── ADMIN AGENDA: solo su dueño ────────────────────────────────────────
create policy aa_own on public.admin_agenda for all
  using (public.me() = lower(admin_email)) with check (public.me() = lower(admin_email));

-- ── CATÁLOGOS PÚBLICOS (escritura solo server/sb_secret) ───────────────
alter table public.achievements enable row level security;
create policy ach_select on public.achievements for select using (true);

alter table public.bots enable row level security;
create policy bots_select on public.bots for select using (true);
create policy bots_update on public.bots for update using (auth.role() = 'authenticated'); -- last_posted_at lo toca el cliente bot-runner

alter table public.complexes enable row level security;
create policy cx_select on public.complexes for select using (true);
create policy cx_insert on public.complexes for insert with check (public.me() = lower(coalesce(email,'')));
create policy cx_update on public.complexes for update using (public.me() = lower(coalesce(email,'')));

-- ── PLAYER ACHIEVEMENTS: públicos de lectura; el cliente desbloquea los propios ─
create policy pach_select on public.player_achievements for select using (true);
create policy pach_insert on public.player_achievements for insert with check (public.me() = lower(player_email));

-- ── BUSINESS REQUESTS (alta de negocios): el solicitante ve/edita lo suyo ──
create policy br_select on public.business_requests for select using (public.me() = lower(email));
create policy br_insert on public.business_requests for insert with check (public.me() = lower(email));
create policy br_update on public.business_requests for update using (public.me() = lower(email));

-- ── CATÁLOGO del negocio: lectura pública, escribe el dueño ────────────
create policy bp_select on public.business_products for select using (true);
create policy bp_write on public.business_products for insert with check (public.me() = lower(business_email));
create policy bp_update on public.business_products for update using (public.me() = lower(business_email));
create policy bp_delete on public.business_products for delete using (public.me() = lower(business_email));

create policy bs_select on public.business_services for select using (true);
create policy bs_write on public.business_services for insert with check (public.me() = lower(business_email));
create policy bs_update on public.business_services for update using (public.me() = lower(business_email));
create policy bs_delete on public.business_services for delete using (public.me() = lower(business_email));

create policy bc_select on public.business_courts for select using (true);
create policy bc_write on public.business_courts for insert with check (public.me() = lower(business_email));
create policy bc_update on public.business_courts for update using (public.me() = lower(business_email));
create policy bc_delete on public.business_courts for delete using (public.me() = lower(business_email));

create policy bfaq_select on public.business_chatbot_faq for select using (true);
create policy bfaq_write on public.business_chatbot_faq for insert with check (public.me() = lower(business_email));
create policy bfaq_update on public.business_chatbot_faq for update using (public.me() = lower(business_email));
create policy bfaq_delete on public.business_chatbot_faq for delete using (public.me() = lower(business_email));

create policy brev_select on public.business_reviews for select using (true);
create policy brev_insert on public.business_reviews for insert with check (public.me() = lower(reviewer_email));
create policy brev_update on public.business_reviews for update using (public.me() = lower(reviewer_email));
create policy brev_delete on public.business_reviews for delete using (public.me() = lower(reviewer_email));

-- ── OPERACIONES negocio↔cliente: solo los dos lados ────────────────────
create policy bres_select on public.business_reservations for select
  using (public.me() in (lower(business_email), lower(coalesce(client_email,''))));
create policy bres_insert on public.business_reservations for insert
  with check (public.me() in (lower(business_email), lower(coalesce(client_email,''))));
create policy bres_update on public.business_reservations for update
  using (public.me() in (lower(business_email), lower(coalesce(client_email,''))));

create policy bord_select on public.business_orders for select
  using (public.me() in (lower(business_email), lower(coalesce(client_email,''))));
create policy bord_insert on public.business_orders for insert
  with check (public.me() in (lower(business_email), lower(coalesce(client_email,''))));
create policy bord_update on public.business_orders for update
  using (public.me() = lower(business_email));

create policy bapp_select on public.business_appointments for select
  using (public.me() in (lower(business_email), lower(coalesce(client_email,''))));
create policy bapp_insert on public.business_appointments for insert
  with check (public.me() in (lower(business_email), lower(coalesce(client_email,''))));
create policy bapp_update on public.business_appointments for update
  using (public.me() in (lower(business_email), lower(coalesce(client_email,''))));

create policy bpay_select on public.business_client_payments for select
  using (public.me() in (lower(business_email), lower(coalesce(client_email,''))));
create policy bpay_write on public.business_client_payments for insert
  with check (public.me() = lower(business_email));
create policy bpay_update on public.business_client_payments for update
  using (public.me() = lower(business_email));

create policy bemp_select on public.business_employees for select
  using (public.me() in (lower(business_email), lower(coalesce(employee_email,''))));
create policy bemp_write on public.business_employees for insert with check (public.me() = lower(business_email));
create policy bemp_update on public.business_employees for update using (public.me() = lower(business_email));
create policy bemp_delete on public.business_employees for delete using (public.me() = lower(business_email));
