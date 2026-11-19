import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Check, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES, isLanguageCode, type LanguageCode } from "@/i18n/languages";

/**
 * Seletor de idioma (à esquerda do perfil). A escolha fica no navegador e, com
 * sessão iniciada, no perfil (profiles.preferred_language), para notificações e
 * e-mails e para os outros dispositivos.
 */
const LanguageSwitcher = ({ className = "" }: { className?: string }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const current = (i18n.resolvedLanguage ?? "pt") as LanguageCode;

  // Ao iniciar sessão, usa o idioma guardado no perfil (se houver).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("preferred_language")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const saved = data?.preferred_language;
        if (isLanguageCode(saved)) {
          if (saved !== i18n.resolvedLanguage) i18n.changeLanguage(saved);
        } else if (data && isLanguageCode(i18n.resolvedLanguage)) {
          // Primeira sessão: guarda o idioma em uso (e-mails e notificações).
          supabase.from("profiles").update({ preferred_language: i18n.resolvedLanguage }).eq("id", user.id).then();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, i18n]);

  const choose = async (code: LanguageCode) => {
    await i18n.changeLanguage(code);
    if (user) await supabase.from("profiles").update({ preferred_language: code }).eq("id", user.id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary ${className}`}
        aria-label={t("language.choose")}
      >
        <Globe className="h-4 w-4 text-primary" />
        <span className="uppercase">{current}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t("language.label")}</DropdownMenuLabel>
        {LANGUAGES.map((l) => (
          <DropdownMenuItem key={l.code} lang={l.code} onSelect={() => choose(l.code)} className="justify-between">
            {l.label}
            {l.code === current && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
