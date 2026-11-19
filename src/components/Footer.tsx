import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logoValorRural from "@/assets/logo-valorrural-horizontal.png";
import { useConsent } from "@/contexts/ConsentContext";
import { setAnimationsPaused } from "@/lib/animation";
import { useAnimationsPaused } from "@/hooks/useReducedMotion";
import { siteLinks } from "@/lib/site-links";

const Footer = () => {
  const { t } = useTranslation();
  const { openPreferences } = useConsent();
  const animationsPaused = useAnimationsPaused();
  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center">
              <img
                src={logoValorRural}
                alt={t("header.logoAlt")}
                width={903}
                height={240}
                className="h-8 w-auto"
              />
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">{t("footer.tagline")}</p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">{t("footer.browse")}</h4>
            <div className="flex flex-col gap-2">
              {siteLinks.map((link) => (
                <Link key={link.to} to={link.to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t(link.labelKey)}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">{t("footer.account")}</h4>
            <div className="flex flex-col gap-2">
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("header.login")}</Link>
              <Link to="/auth?tab=signup" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("header.signup")}</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">{t("footer.contact")}</h4>
            <p className="text-sm text-muted-foreground">info@valorrural.pt</p>
            <p className="text-sm text-muted-foreground">+351 912 345 678</p>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:justify-between">
          <span>{t("footer.rights")}</span>
          <nav aria-label={t("footer.legalAria")} className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link to="/termos" className="hover:text-primary transition-colors">{t("footer.terms")}</Link>
            <Link to="/privacidade" className="hover:text-primary transition-colors">{t("footer.privacy")}</Link>
            <button type="button" onClick={openPreferences} className="hover:text-primary transition-colors">
              {t("footer.cookies")}
            </button>
            <button
              type="button"
              aria-pressed={animationsPaused}
              onClick={() => setAnimationsPaused(!animationsPaused)}
              className="hover:text-primary transition-colors"
            >
              {animationsPaused ? t("footer.resumeAnimations") : t("footer.pauseAnimations")}
            </button>
            <a
              href="https://www.livroreclamacoes.pt"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              {t("footer.complaints")}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
