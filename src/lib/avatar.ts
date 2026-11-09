/**
 * Fotografia de perfil: profiles.avatar_url guarda o caminho no bucket `avatars`.
 * Valores antigos (URLs escritos à mão) não contam como fotografia.
 */
import { supabase } from "@/integrations/supabase/client";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const AVATAR_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const isStoredAvatar = (value: string | null | undefined): value is string =>
  !!value && /^[0-9a-f-]{36}\/[A-Za-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(value);

export const avatarPublicUrl = (path: string) =>
  supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
