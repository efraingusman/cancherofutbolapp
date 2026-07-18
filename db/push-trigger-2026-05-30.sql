-- Trigger: al insertar una notificacion, llamar la Edge Function push-notifications
-- Usa pg_net (ya habilitado). Envia { record: NEW } como espera la funcion.

CREATE OR REPLACE FUNCTION public.notify_push_on_notification()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://dofbxgqzcvfjpnvcvdjb.supabase.co/functions/v1/push-notifications',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('record', jsonb_build_object(
      'recipient_email', NEW.recipient_email,
      'message', NEW.message,
      'actor_name', NEW.actor_name,
      'type', NEW.type
    ))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_push_on_notification ON public.notifications;
CREATE TRIGGER trg_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_notification();
