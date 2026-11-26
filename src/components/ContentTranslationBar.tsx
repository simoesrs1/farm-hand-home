import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useContentTranslation } from "@/contexts/ContentTranslationContext";

/** Botão único que traduz o texto de agricultores e clientes. Não aparece em português. */
const ContentTranslationBar = () => {
  const { t, i18n } = useTranslation();
  const { enabled, setEnabled, hasContent } = useContentTranslation();

  if (!hasContent || i18n.resolvedLanguage === "pt") return null;

  return (
    <div className="border-b border-border bg-muted/50">
      <div className="container flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-sm text-muted-foreground">
        <Languages className="h-4 w-4 shrink-0" aria-hidden />
        <p>{enabled ? t("content.translated") : t("content.original")}</p>
        <Button size="sm" variant={enabled ? "outline" : "default"} className="h-7" onClick={() => setEnabled(!enabled)}>
          {enabled ? t("content.showOriginals") : t("content.translate")}
        </Button>
      </div>
    </div>
  );
};

export default ContentTranslationBar;
