-- FIX 2026-06-12: match_players no tenía unique(match_id,player_email) y TODOS
-- los upsert con onConflict fallaban en silencio → al aceptar una solicitud el
-- jugador nunca quedaba en la plantilla (sin chat, sin posición, y el panel le
-- seguía ofreciendo "enviar solicitud").

-- 1) Dedupe: conservar la mejor fila por (match_id, player_email)
--    (prioridad: confirmado > otras; luego la más nueva)
delete from match_players mp using (
  select id, row_number() over (
    partition by match_id, lower(player_email)
    order by (case when coalesce(status,'') in ('confirmado','accepted','aceptado','titular') then 0 else 1 end),
             id
  ) rn
  from match_players
) d
where mp.id = d.id and d.rn > 1;

-- 2) La constraint que el código espera
alter table match_players
  add constraint match_players_match_id_player_email_key unique (match_id, player_email);

-- 3) REPARAR: solicitudes ya aceptadas cuyo jugador nunca entró a la plantilla
insert into match_players (match_id, player_email, player_name, team, position_slot, position, is_sub, status)
select r.match_id, r.user_email, coalesce(r.user_name, r.user_email), coalesce(r.team,'home'),
       r.position_slot, coalesce(r.position_slot,'MED'), false, 'confirmado'
from match_requests r
where coalesce(r.status,'') in ('accepted','aceptada','aceptado')
  and coalesce(r.type,'player') = 'player'
  and not exists (select 1 from match_players mp where mp.match_id = r.match_id and lower(mp.player_email) = lower(r.user_email))
on conflict (match_id, player_email) do nothing;
