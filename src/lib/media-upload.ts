/**
 * Fotografias e vídeos de experiências e alojamento: bucket `product-media`,
 * na pasta do utilizador (mesmas permissões das fotografias dos produtos).
 */
import { supabase } from "@/integrations/supabase/client";

export const MAX_MEDIA = 8;

export const isVideoPath = (path: string) => /\.(mp4|webm|mov)$/i.test(path);

/** Carrega os ficheiros e devolve os caminhos no bucket. */
export const uploadMedia = async (userId: string, files: File[]) => {
  const paths: string[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-media").upload(path, file, { contentType: file.type });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
};

/** Ligações temporárias para mostrar ficheiros do bucket (privado). */
export const signMedia = async (paths: string[]) => {
  const entries = await Promise.all(
    paths.map(async (path) => {
      const { data } = await supabase.storage.from("product-media").createSignedUrl(path, 60 * 60);
      return [path, data?.signedUrl ?? ""] as const;
    }),
  );
  return Object.fromEntries(entries.filter(([, url]) => url));
};
