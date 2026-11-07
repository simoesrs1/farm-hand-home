-- Agendamento das Edge Functions protegidas por CRON_SECRET
-- (expire-orders e farmer-activity), através do pg_cron + pg_net.
--
-- O URL do projeto e o segredo ficam no Vault, nunca neste ficheiro.
-- Configurar uma vez por projeto (SQL editor ou `supabase db query`):
--   SELECT vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   SELECT vault.create_secret('<o mesmo valor do segredo CRON_SECRET>', 'cron_secret');
-- Sem estes dois segredos, os crons correm mas só deixam um aviso no log.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE OR REPLACE FUNCTION public.invoke_cron_edge_function(p_function text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret';

  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE WARNING 'invoke_cron_edge_function(%): project_url ou cron_secret em falta no Vault', p_function;
    RETURN NULL;
  END IF;

  RETURN net.http_post(
    url := v_url || '/functions/v1/' || p_function,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
END;
$$;

-- Só o pg_cron (dono: postgres) a chama; nunca exposta via API.
REVOKE EXECUTE ON FUNCTION public.invoke_cron_edge_function(text) FROM PUBLIC, anon, authenticated;

-- Encomendas fora do prazo de levantamento: de hora a hora (minuto 15).
SELECT cron.schedule(
  'expire-orders',
  '15 * * * *',
  $$SELECT public.invoke_cron_edge_function('expire-orders')$$
);

-- Atividade dos agricultores + lembretes: uma vez por dia.
-- O pg_cron usa UTC: 06:00 UTC = 07:00 em Lisboa no verão, 06:00 no inverno.
SELECT cron.schedule(
  'farmer-activity',
  '0 6 * * *',
  $$SELECT public.invoke_cron_edge_function('farmer-activity')$$
);
