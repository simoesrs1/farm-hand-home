import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
import type { ContentType } from "@/lib/content-translation";

interface TranslatedTextProps {
  type: ContentType;
  id: string | null | undefined;
  field: string;
  /** Texto original (o que está na base de dados). */
  text: string;
  as?: "p" | "span" | "h1" | "h2" | "h3" | "div";
  className?: string;
  /** Mostra "Ver original" / "Ver tradução" (textos longos: descrições, avaliações, mensagens). */
  toggle?: boolean;
}

/** Conteúdo escrito por pessoas, traduzido para o idioma escolhido no site. */
const TranslatedText = ({ type, id, field, text, as: Tag = "span", className, toggle = false }: TranslatedTextProps) => {
  const { t } = useTranslation();
  const { text: translated, isTranslated } = useTranslatedContent(type, id, field, text);
  const [showOriginal, setShowOriginal] = useState(false);
  const shown = isTranslated && !showOriginal ? translated : text;

  if (!toggle || !isTranslated) return <Tag className={className}>{shown}</Tag>;
  return (
    <>
      <Tag className={className}>{shown}</Tag>
      <button
        type="button"
        onClick={() => setShowOriginal((s) => !s)}
        className="mt-1 block text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {showOriginal ? t("content.showTranslation") : t("content.showOriginal")}
      </button>
    </>
  );
};

export default TranslatedText;
