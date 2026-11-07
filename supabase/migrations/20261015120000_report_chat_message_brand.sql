-- Atualiza a mensagem automática do chat de denúncia: a plataforma passou a chamar-se ValorRural.
CREATE OR REPLACE FUNCTION public.notify_chat_on_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.order_chat_messages (order_id, sender_id, sender_role, content)
  VALUES (
    NEW.order_id,
    NULL,
    'sistema',
    '⚠️ Denúncia aberta pelo ' || NEW.reporter_role ||
    '. O suporte da ValorRural foi notificado e entra agora na conversa para ajudar a resolver a situação. Motivo: ' ||
    NEW.reason
  );
  RETURN NEW;
END;
$$;