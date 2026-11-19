/**
 * "Escrever com IA": prepara o pedido à Edge Function generate-product-description
 * (texto do agricultor, dados do formulário e até 3 fotografias) e devolve a
 * proposta de descrição. Ver docs/ia-descricoes.md.
 */
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n";
import { isVideoPath } from "@/lib/media-upload";

export type CopyKind = "product" | "experience" | "stay";
export type CopyFacts = Record<string, string | number | boolean | null | undefined>;

export const MAX_AI_IMAGES = 3;
/** Lado maior das fotografias enviadas: acima disto a API reduz na mesma e só gasta mais. */
const MAX_EDGE_PX = 1568;
const JPEG_QUALITY = 0.85;

const IMAGE_PATH = /\.(jpe?g|png|gif|webp)$/i;

/** Até 3 fotografias: as novas primeiro, depois as já guardadas; vídeos ficam de fora. */
export const pickImageSources = (files: File[], paths: string[]) => {
  const newImages = files.filter((f) => f.type.startsWith("image/")).slice(0, MAX_AI_IMAGES);
  const stored = paths
    .filter((p) => !isVideoPath(p) && IMAGE_PATH.test(p))
    .slice(0, MAX_AI_IMAGES - newImages.length);
  return { files: newImages, paths: stored };
};

/** Só os dados preenchidos (os vazios não ajudam a IA e gastam tokens). */
export const cleanFacts = (facts: CopyFacts) =>
  Object.fromEntries(
    Object.entries(facts).filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== false),
  ) as Record<string, string | number | boolean>;

/** Há alguma coisa em que a IA se possa basear? */
export const hasCopyInput = (draft: string, facts: CopyFacts, files: File[], paths: string[]) => {
  const images = pickImageSources(files, paths);
  return (
    draft.trim().length > 0 ||
    Object.keys(cleanFacts(facts)).length > 0 ||
    images.files.length + images.paths.length > 0
  );
};

/** Reduz a fotografia no browser (lado maior ≤ 1568 px, JPEG) e devolve um data URL. */
export const fileToResizedDataUrl = async (file: File): Promise<string> => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
};

export interface GenerateCopyInput {
  kind: CopyKind;
  draft: string;
  facts: CopyFacts;
  files?: File[];
  storedPaths?: string[];
}

/** Pede a proposta à Edge Function. Lança um Error com a mensagem para o agricultor. */
export const generateDescription = async ({ kind, draft, facts, files = [], storedPaths = [] }: GenerateCopyInput) => {
  const picked = pickImageSources(files, storedPaths);
  const images = await Promise.all(picked.files.map(fileToResizedDataUrl));
  const { data, error } = await supabase.functions.invoke<{ description?: string; error?: string }>(
    "generate-product-description",
    { body: { kind, draft, facts: cleanFacts(facts), images, imagePaths: picked.paths } },
  );
  if (error) {
    // Numa resposta não-2xx, a razão real ({ error: "..." }) está no corpo, em error.context.
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        if (body?.error) msg = body.error;
      } catch {
        // corpo não é JSON: fica a mensagem genérica
      }
    }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.description) throw new Error(i18n.t("offerings:ai.failed"));
  return data.description;
};
