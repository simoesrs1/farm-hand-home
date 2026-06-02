
-- Revoke EXECUTE from anon/authenticated on SECURITY DEFINER functions that should not be callable from the API.
-- Trigger functions and cron-only functions don't need PUBLIC execute.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_chat_on_report() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_old_order_chats() FROM PUBLIC, anon, authenticated;

-- RLS helper functions: only authenticated users need to evaluate these via policies.
REVOKE EXECUTE ON FUNCTION public.user_owns_farmer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_in_order(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_is_order_client(uuid) FROM PUBLIC, anon;
