-- ════════════════════════════════════════════════════════════════════
-- RLS FASE 3 — TANDA B: contenido social (2026-06-11)
-- select público (red social) · insert solo como yo · update/delete dueño.
-- Contadores (likes/comments/shares/views) pasan a TRIGGERS security definer
-- porque el cliente ya no puede updatear posts ajenos.
-- ════════════════════════════════════════════════════════════════════

-- Drop de políticas previas de estas tablas
do $$
declare r record;
begin
  for r in select tablename, policyname from pg_policies
    where schemaname='public' and tablename in
    ('posts','post_likes','post_comments','stories','momentos','momento_likes',
     'momento_views','follows','polls','poll_votes','debates','debate_arguments',
     'debate_comments','debate_votes','debate_jury','argument_votes','predictions',
     'live_streams','live_comments','live_stream_comments','live_stream_events',
     'live_stream_predictions','live_stream_reactions','profile_pinned_lives','reports','content_reports')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ── Helper genérico: select público / escritura del dueño ─────────────
-- (no hay FOR ALL para no abrir delete a todos)

-- POSTS
alter table public.posts enable row level security;
create policy posts_select on public.posts for select using (true);
create policy posts_insert on public.posts for insert with check (public.me() = lower(user_email));
create policy posts_update on public.posts for update using (public.me() = lower(user_email));
create policy posts_delete on public.posts for delete using (public.me() = lower(user_email));

-- POST LIKES (+ trigger de contador)
alter table public.post_likes enable row level security;
create policy plikes_select on public.post_likes for select using (true);
create policy plikes_insert on public.post_likes for insert with check (public.me() = lower(user_email));
create policy plikes_delete on public.post_likes for delete using (public.me() = lower(user_email));

create or replace function public.sync_likes_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update posts set likes_count = (select count(*) from post_likes where post_id = coalesce(new.post_id, old.post_id))
  where id = coalesce(new.post_id, old.post_id);
  return null;
end $$;
drop trigger if exists trg_likes_count on public.post_likes;
create trigger trg_likes_count after insert or delete on public.post_likes
  for each row execute function public.sync_likes_count();

-- POST COMMENTS (+ trigger)
alter table public.post_comments enable row level security;
create policy pcom_select on public.post_comments for select using (true);
create policy pcom_insert on public.post_comments for insert with check (public.me() = lower(user_email));
create policy pcom_update on public.post_comments for update using (public.me() = lower(user_email));
create policy pcom_delete on public.post_comments for delete using (public.me() = lower(user_email));

create or replace function public.sync_comments_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update posts set comments_count = (select count(*) from post_comments where post_id = coalesce(new.post_id, old.post_id))
  where id = coalesce(new.post_id, old.post_id);
  return null;
end $$;
drop trigger if exists trg_comments_count on public.post_comments;
create trigger trg_comments_count after insert or delete on public.post_comments
  for each row execute function public.sync_comments_count();

-- SHARES: rpc segura para incrementar (el cliente no updatea posts ajenos)
create or replace function public.bump_share(p_post_id uuid) returns void
language sql security definer set search_path = public as
$$ update posts set shares_count = coalesce(shares_count,0) + 1 where id = p_post_id; $$;

-- VIEWS de reels: rpc segura
create or replace function public.bump_view(p_post_id uuid) returns void
language sql security definer set search_path = public as
$$ update posts set views_count = coalesce(views_count,0) + 1 where id = p_post_id; $$;

-- STORIES
alter table public.stories enable row level security;
create policy stories_select on public.stories for select using (true);
create policy stories_insert on public.stories for insert with check (public.me() = lower(user_email));
create policy stories_update on public.stories for update using (public.me() = lower(user_email));
create policy stories_delete on public.stories for delete using (public.me() = lower(user_email));

-- MOMENTOS (+ likes/views propios)
alter table public.momentos enable row level security;
create policy mom_select on public.momentos for select using (true);
create policy mom_insert on public.momentos for insert with check (public.me() = lower(user_email));
create policy mom_update on public.momentos for update using (public.me() = lower(user_email));
create policy mom_delete on public.momentos for delete using (public.me() = lower(user_email));

alter table public.momento_likes enable row level security;
create policy momlike_select on public.momento_likes for select using (true);
create policy momlike_write on public.momento_likes for insert with check (public.me() = lower(user_email));
create policy momlike_delete on public.momento_likes for delete using (public.me() = lower(user_email));

alter table public.momento_views enable row level security;
create policy momview_select on public.momento_views for select using (true);
create policy momview_write on public.momento_views for insert with check (public.me() = lower(user_email));

-- FOLLOWS
alter table public.follows enable row level security;
create policy follows_select on public.follows for select using (true);
create policy follows_insert on public.follows for insert with check (public.me() = lower(follower_email));
create policy follows_delete on public.follows for delete using (public.me() = lower(follower_email));

-- POLLS
alter table public.polls enable row level security;
create policy polls_select on public.polls for select using (true);
create policy polls_insert on public.polls for insert with check (public.me() = lower(creator_email));
create policy polls_update on public.polls for update using (public.me() = lower(creator_email));
create policy polls_delete on public.polls for delete using (public.me() = lower(creator_email));

alter table public.poll_votes enable row level security;
create policy pvotes_select on public.poll_votes for select using (true);
create policy pvotes_insert on public.poll_votes for insert with check (public.me() = lower(voter_email));
create policy pvotes_update on public.poll_votes for update using (public.me() = lower(voter_email));

-- DEBATES
alter table public.debates enable row level security;
create policy deb_select on public.debates for select using (true);
create policy deb_insert on public.debates for insert with check (public.me() = lower(created_by));
create policy deb_update on public.debates for update using (auth.role() = 'authenticated'); -- fases/estado las avanza cualquiera (cron del cliente)
create policy deb_delete on public.debates for delete using (public.me() = lower(created_by));

alter table public.debate_arguments enable row level security;
create policy debarg_select on public.debate_arguments for select using (true);
create policy debarg_insert on public.debate_arguments for insert with check (public.me() = lower(user_email));
create policy debarg_update on public.debate_arguments for update using (auth.role() = 'authenticated'); -- conteo de votos
create policy debarg_delete on public.debate_arguments for delete using (public.me() = lower(user_email));

alter table public.debate_comments enable row level security;
create policy debcom_select on public.debate_comments for select using (true);
create policy debcom_insert on public.debate_comments for insert with check (public.me() = lower(user_email));

alter table public.debate_votes enable row level security;
create policy debvote_select on public.debate_votes for select using (true);
create policy debvote_insert on public.debate_votes for insert with check (public.me() = lower(user_email));

alter table public.debate_jury enable row level security;
create policy debjury_select on public.debate_jury for select using (true);
create policy debjury_insert on public.debate_jury for insert with check (public.me() = lower(user_email));

alter table public.argument_votes enable row level security;
create policy argvote_select on public.argument_votes for select using (true);
create policy argvote_insert on public.argument_votes for insert with check (public.me() = lower(user_email));
create policy argvote_delete on public.argument_votes for delete using (public.me() = lower(user_email));

-- PREDICTIONS (generales)
alter table public.predictions enable row level security;
create policy preds_select on public.predictions for select using (true);
create policy preds_insert on public.predictions for insert with check (public.me() = lower(user_email));
create policy preds_update on public.predictions for update using (public.me() = lower(user_email));
create policy preds_delete on public.predictions for delete using (public.me() = lower(user_email));

-- LIVES
alter table public.live_streams enable row level security;
create policy live_select on public.live_streams for select using (true);
create policy live_insert on public.live_streams for insert with check (public.me() = lower(streamer_email));
create policy live_update on public.live_streams for update using (public.me() = lower(streamer_email));
create policy live_delete on public.live_streams for delete using (public.me() = lower(streamer_email));

alter table public.live_comments enable row level security;
create policy livec_select on public.live_comments for select using (true);
create policy livec_insert on public.live_comments for insert with check (public.me() = lower(user_email));

alter table public.live_stream_comments enable row level security;
create policy livesc_select on public.live_stream_comments for select using (true);
create policy livesc_insert on public.live_stream_comments for insert with check (public.me() = lower(user_email));

alter table public.live_stream_events enable row level security;
create policy livee_select on public.live_stream_events for select using (true);
create policy livee_insert on public.live_stream_events for insert with check (auth.role() = 'authenticated');

alter table public.live_stream_predictions enable row level security;
create policy livep_select on public.live_stream_predictions for select using (true);
create policy livep_insert on public.live_stream_predictions for insert with check (public.me() = lower(user_email));

alter table public.live_stream_reactions enable row level security;
create policy liver_select on public.live_stream_reactions for select using (true);
create policy liver_insert on public.live_stream_reactions for insert with check (public.me() = lower(user_email));

alter table public.profile_pinned_lives enable row level security;
create policy ppl_select on public.profile_pinned_lives for select using (true);
create policy ppl_write on public.profile_pinned_lives for all
  using (public.me() = lower(user_email)) with check (public.me() = lower(user_email));

-- REPORTES (denuncias): crear autenticado, leer nadie (solo admin via sb_secret)
alter table public.reports enable row level security;
create policy reports_insert on public.reports for insert with check (auth.role() = 'authenticated');

alter table public.content_reports enable row level security;
create policy creports_insert on public.content_reports for insert with check (auth.role() = 'authenticated');
create or replace function public.increment_post_views(p_post_id uuid) returns void
language sql security definer set search_path = public as
$$ update posts set views_count = coalesce(views_count,0) + 1 where id = p_post_id; $$;
create or replace function public.increment_post_shares(p_post_id uuid) returns void
language sql security definer set search_path = public as
$$ update posts set shares_count = coalesce(shares_count,0) + 1 where id = p_post_id; $$;
grant execute on function public.increment_post_views(uuid), public.increment_post_shares(uuid),
  public.bump_share(uuid), public.bump_view(uuid) to anon, authenticated;
