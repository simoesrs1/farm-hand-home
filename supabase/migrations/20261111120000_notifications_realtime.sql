-- Notificações em tempo real: o sino (NotificationBell) está à escuta de INSERT
-- em public.notifications, mas a tabela nunca foi adicionada à publicação do
-- Realtime nas migrações. Só a adiciona se ainda lá não estiver (pode ter sido
-- ligada à mão no painel). Cada utilizador só recebe as suas linhas, pela policy
-- "Users view own notifications".
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
