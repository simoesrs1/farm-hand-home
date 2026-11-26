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
  /** Só para o chat: a conversa tem a tradução ligada. */
  translate?: boolean;
}

/** Conteúdo escrito por pessoas, que se traduz a pedido para o idioma escolhido no site. */
const TranslatedText = ({ type, id, field, text, as: Tag = "span", className, translate }: TranslatedTextProps) => {
  const { text: shown } = useTranslatedContent(type, id, field, text, translate);
  return <Tag className={className}>{shown}</Tag>;
};

export default TranslatedText;
