-- ════════════════════════════════════════════════════════════════════
-- RLS FASE 4 — TANDA C: partidos, equipos y juegos (2026-06-11)
-- Regla especial: el CAPITÁN (creador o capitanes del match) puede
-- gestionar filas de otros jugadores de SU partido.
-- ════════════════════════════════════════════════════════════════════

do $$
declare r record;
begin
  for r in select tablename, policyname from pg_policies
    where schemaname='public' and tablename in
    ('matches','match_players','match_requests','match_invites','match_chat',
     'match_events','match_checkins','match_bets','match_predictions','match_reviews',
     'match_confirmations','match_media','match_costs','match_captain_log',
     'clubs','club_members','club_rules','club_practices','club_tactics','club_achievements',
     'squad_requests','squad_applications','team_members',
     'game_scores','game_challenges','game_stats','game_rooms','game_players','game_messages',
     'prediction_bets','tournaments','tournament_teams','tournament_players','tournament_matches')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Helper: ¿soy capitán/creador del partido? (security definer, sin recursión)
create or replace function public.is_match_captain(mid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from matches where id = mid and public.me() in (
      lower(coalesce(created_by,'')), lower(coalesce(captain_home_email,'')), lower(coalesce(captain_away_email,'')))
  );
$$;

-- Helper: ¿soy dueño/capitán del club?
create or replace function public.is_club_owner(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from clubs where id = cid and public.me() in (
      lower(coalesce(owner_email,'')), lower(coalesce(captain_2_email,'')))
  );
$$;

-- ── MATCHES: lectura pública; escribir solo capitán/creador ───────────
alter table public.matches enable row level security;
create policy m_select on public.matches for select using (true);
create policy m_insert on public.matches for insert with check (public.me() = lower(created_by));
create policy m_update on public.matches for update using (public.is_match_captain(id));
create policy m_delete on public.matches for delete using (public.me() = lower(created_by));

-- slots_taken: trigger desde match_players confirmados (el cliente deja de updatear)
create or replace function public.sync_slots_taken() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update matches set slots_taken = (
    select count(*) from match_players
    where match_id = coalesce(new.match_id, old.match_id)
      and coalesce(status,'confirmado') in ('confirmado','accepted','aceptado','titular'))
  where id = coalesce(new.match_id, old.match_id);
  return null;
end $$;
drop trigger if exists trg_slots_taken on public.match_players;
create trigger trg_slots_taken after insert or update or delete on public.match_players
  for each row execute function public.sync_slots_taken();

-- ── MATCH PLAYERS: yo me anoto/edito; el capitán gestiona a todos ─────
alter table public.match_players enable row level security;
create policy mp_select on public.match_players for select using (true);
create policy mp_insert on public.match_players for insert with check (
  public.me() = lower(player_email) or public.is_match_captain(match_id)
);
create policy mp_update on public.match_players for update using (
  public.me() = lower(player_email) or public.is_match_captain(match_id)
);
create policy mp_delete on public.match_players for delete using (
  public.me() = lower(player_email) or public.is_match_captain(match_id)
);

-- ── MATCH REQUESTS: yo pido; el capitán resuelve ──────────────────────
alter table public.match_requests enable row level security;
create policy mr_select on public.match_requests for select using (
  public.me() = lower(user_email) or public.is_match_captain(match_id)
);
create policy mr_insert on public.match_requests for insert with check (public.me() = lower(user_email));
create policy mr_update on public.match_requests for update using (
  public.me() = lower(user_email) or public.is_match_captain(match_id)
);
create policy mr_delete on public.match_requests for delete using (
  public.me() = lower(user_email) or public.is_match_captain(match_id)
);

-- ── MATCH INVITES: emisor/receptor ────────────────────────────────────
alter table public.match_invites enable row level security;
create policy mi_select on public.match_invites for select using (
  public.me() in (lower(from_email), lower(to_email)) or public.is_match_captain(match_id)
);
create policy mi_insert on public.match_invites for insert with check (
  public.me() = lower(from_email) or public.is_match_captain(match_id)
);
create policy mi_update on public.match_invites for update using (
  public.me() in (lower(from_email), lower(to_email))
);
create policy mi_delete on public.match_invites for delete using (
  public.me() = lower(from_email) or public.is_match_captain(match_id)
);

-- ── MATCH CHAT: jugadores del partido + capitanes ─────────────────────
create or replace function public.is_match_member(mid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_match_captain(mid) or exists (
    select 1 from match_players where match_id = mid and lower(player_email) = public.me())
$$;
alter table public.match_chat enable row level security;
create policy mc_select on public.match_chat for select using (public.is_match_member(match_id));
create policy mc_insert on public.match_chat for insert
  with check (public.me() = lower(user_email) and public.is_match_member(match_id));
create policy mc_delete on public.match_chat for delete using (public.me() = lower(user_email));

-- ── EVENTOS / CHECKINS / MEDIA / COSTOS / REVIEWS / CONFIRMACIONES ───
alter table public.match_events enable row level security;
create policy me_select on public.match_events for select using (true);
create policy me_insert on public.match_events for insert with check (public.is_match_member(match_id));
create policy me_update on public.match_events for update using (public.is_match_captain(match_id));
create policy me_delete on public.match_events for delete using (public.is_match_captain(match_id));

alter table public.match_checkins enable row level security;
create policy mck_select on public.match_checkins for select using (true);
create policy mck_insert on public.match_checkins for insert with check (public.me() = lower(user_email));

alter table public.match_media enable row level security;
create policy mmedia_select on public.match_media for select using (true);
create policy mmedia_insert on public.match_media for insert with check (public.me() = lower(user_email));
create policy mmedia_delete on public.match_media for delete using (
  public.me() = lower(user_email) or public.is_match_captain(match_id)
);

alter table public.match_costs enable row level security;
create policy mcosts_select on public.match_costs for select using (public.is_match_member(match_id));
create policy mcosts_write on public.match_costs for insert with check (public.is_match_captain(match_id));
create policy mcosts_update on public.match_costs for update using (public.is_match_captain(match_id));
create policy mcosts_delete on public.match_costs for delete using (public.is_match_captain(match_id));

alter table public.match_reviews enable row level security;
create policy mrev_select on public.match_reviews for select using (true);
create policy mrev_insert on public.match_reviews for insert with check (public.me() = lower(user_email));
create policy mrev_update on public.match_reviews for update using (public.me() = lower(user_email));

alter table public.match_confirmations enable row level security;
create policy mconf_select on public.match_confirmations for select using (true);
create policy mconf_write on public.match_confirmations for insert with check (
  public.me() = lower(player_email) or public.is_match_captain(match_id)
);
create policy mconf_update on public.match_confirmations for update using (
  public.me() = lower(player_email) or public.is_match_captain(match_id)
);

alter table public.match_captain_log enable row level security;
create policy mcl_select on public.match_captain_log for select using (true);
create policy mcl_insert on public.match_captain_log for insert with check (auth.role() = 'authenticated');

-- ── BETS y PREDICTIONS del partido ────────────────────────────────────
alter table public.match_bets enable row level security;
create policy mb_select on public.match_bets for select using (true);
create policy mb_insert on public.match_bets for insert with check (public.me() = lower(proposer_email));
create policy mb_update on public.match_bets for update using (public.is_match_member(match_id));

alter table public.match_predictions enable row level security;
create policy mpred_select on public.match_predictions for select using (true);
create policy mpred_insert on public.match_predictions for insert with check (public.me() = lower(predictor_email));
create policy mpred_update on public.match_predictions for update using (public.me() = lower(predictor_email));
create policy mpred_delete on public.match_predictions for delete using (public.me() = lower(predictor_email));

alter table public.prediction_bets enable row level security;
create policy pb_select on public.prediction_bets for select using (true);
create policy pb_insert on public.prediction_bets for insert with check (public.me() = lower(challenger_email));
create policy pb_update on public.prediction_bets for update using (
  public.me() in (lower(challenger_email), lower(coalesce(rival_email,'')))
);

-- ── CLUBES ────────────────────────────────────────────────────────────
alter table public.clubs enable row level security;
create policy clubs_select on public.clubs for select using (true);
create policy clubs_insert on public.clubs for insert with check (public.me() = lower(owner_email));
create policy clubs_update on public.clubs for update using (public.is_club_owner(id));
create policy clubs_delete on public.clubs for delete using (public.me() = lower(owner_email));

alter table public.club_members enable row level security;
create policy cm_select on public.club_members for select using (true);
create policy cm_insert on public.club_members for insert with check (
  public.me() = lower(player_email) or public.is_club_owner(club_id)
);
create policy cm_update on public.club_members for update using (
  public.me() = lower(player_email) or public.is_club_owner(club_id)
);
create policy cm_delete on public.club_members for delete using (
  public.me() = lower(player_email) or public.is_club_owner(club_id)
);

alter table public.club_rules enable row level security;
create policy cr_select on public.club_rules for select using (true);
create policy cr_write on public.club_rules for insert with check (auth.role() = 'authenticated');
create policy cr_update on public.club_rules for update using (auth.role() = 'authenticated');
create policy cr_delete on public.club_rules for delete using (auth.role() = 'authenticated');

alter table public.club_practices enable row level security;
create policy cp_select on public.club_practices for select using (true);
create policy cp_write on public.club_practices for insert with check (auth.role() = 'authenticated');

alter table public.club_tactics enable row level security;
create policy ct_select on public.club_tactics for select using (true);
create policy ct_insert on public.club_tactics for insert with check (public.me() = lower(created_by));
create policy ct_update on public.club_tactics for update using (public.me() = lower(created_by));
create policy ct_delete on public.club_tactics for delete using (public.me() = lower(created_by));

alter table public.club_achievements enable row level security;
create policy ca_select on public.club_achievements for select using (true);
create policy ca_insert on public.club_achievements for insert with check (auth.role() = 'authenticated');

alter table public.team_members enable row level security;
create policy tm_select on public.team_members for select using (true);
create policy tm_write on public.team_members for insert with check (
  public.me() = lower(member_email) or auth.role() = 'authenticated'
);
create policy tm_delete on public.team_members for delete using (public.me() = lower(member_email));

-- ── EQUIPOS BUSCAN JUGADORES ──────────────────────────────────────────
alter table public.squad_requests enable row level security;
create policy sr_select on public.squad_requests for select using (true);
create policy sr_insert on public.squad_requests for insert with check (public.me() = lower(captain_email));
create policy sr_update on public.squad_requests for update using (public.me() = lower(captain_email));
create policy sr_delete on public.squad_requests for delete using (public.me() = lower(captain_email));

alter table public.squad_applications enable row level security;
create policy sa_select on public.squad_applications for select using (
  public.me() = lower(applicant_email)
  or exists (select 1 from squad_requests sq where sq.id = squad_applications.request_id and lower(sq.captain_email) = public.me())
);
create policy sa_insert on public.squad_applications for insert with check (public.me() = lower(applicant_email));
create policy sa_update on public.squad_applications for update using (
  exists (select 1 from squad_requests sq where sq.id = squad_applications.request_id and lower(sq.captain_email) = public.me())
);

-- ── JUEGOS ────────────────────────────────────────────────────────────
alter table public.game_scores enable row level security;
create policy gs_select on public.game_scores for select using (true);
create policy gs_insert on public.game_scores for insert with check (public.me() = lower(user_email));
create policy gs_update on public.game_scores for update using (public.me() = lower(user_email));

alter table public.game_challenges enable row level security;
create policy gch_select on public.game_challenges for select using (
  public.me() in (lower(from_email), lower(to_email))
);
create policy gch_insert on public.game_challenges for insert with check (public.me() = lower(from_email));
create policy gch_update on public.game_challenges for update using (
  public.me() in (lower(from_email), lower(to_email))
);

alter table public.game_stats enable row level security;
create policy gst_select on public.game_stats for select using (true);
create policy gst_write on public.game_stats for insert with check (public.me() = lower(user_email));
create policy gst_update on public.game_stats for update using (public.me() = lower(user_email));

alter table public.game_rooms enable row level security;
create policy gr_select on public.game_rooms for select using (true);
create policy gr_insert on public.game_rooms for insert with check (public.me() = lower(host_email));
create policy gr_update on public.game_rooms for update using (auth.role() = 'authenticated');

alter table public.game_players enable row level security;
create policy gp_select on public.game_players for select using (true);
create policy gp_write on public.game_players for insert with check (public.me() = lower(user_email));
create policy gp_update on public.game_players for update using (public.me() = lower(user_email));
create policy gp_delete on public.game_players for delete using (public.me() = lower(user_email));

alter table public.game_messages enable row level security;
create policy gmsg2_select on public.game_messages for select using (true);
create policy gmsg2_insert on public.game_messages for insert with check (public.me() = lower(user_email));

-- ── TORNEOS ───────────────────────────────────────────────────────────
alter table public.tournaments enable row level security;
create policy t_select on public.tournaments for select using (true);
create policy t_insert on public.tournaments for insert with check (public.me() = lower(organizer_email));
create policy t_update on public.tournaments for update using (public.me() = lower(organizer_email));
create policy t_delete on public.tournaments for delete using (public.me() = lower(organizer_email));

alter table public.tournament_teams enable row level security;
create policy tt_select on public.tournament_teams for select using (true);
create policy tt_insert on public.tournament_teams for insert with check (public.me() = lower(captain_email));
create policy tt_update on public.tournament_teams for update using (public.me() = lower(captain_email));

alter table public.tournament_players enable row level security;
create policy tp_select on public.tournament_players for select using (true);
create policy tp_write on public.tournament_players for insert with check (auth.role() = 'authenticated');

alter table public.tournament_matches enable row level security;
create policy tmx_select on public.tournament_matches for select using (true);
create policy tmx_write on public.tournament_matches for insert with check (auth.role() = 'authenticated');
create policy tmx_update on public.tournament_matches for update using (auth.role() = 'authenticated');
