-- P0.5: chats por identidad — etiquetar remitente/destinatario con su identidad
alter table messages add column if not exists sender_profile text;
alter table messages add column if not exists recipient_profile text;
