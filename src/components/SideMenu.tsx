import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BedDouble,
  Boxes,
  ClipboardList,
  Clock,
  Eye,
  Heart,
  LogOut,
  Menu,
  Package,
  Repeat,
  ScanLine,
  Settings as SettingsIcon,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tent,
  TrendingUp,
  User,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFarmerOfferings } from "@/hooks/useFarmerOfferings";
import type { Offering } from "@/lib/farmer-offerings";
import { siteLinks } from "@/lib/site-links";
import { useTranslation } from "react-i18next";
import type { ParseKeys } from "i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// `requires`: só aparece se o agricultor disponibilizar essa opção.
// `labelKey`: chave de tradução em src/locales/<idioma>/common.json.
type MenuLink = { to: string; labelKey: ParseKeys<"common">; Icon: LucideIcon; requires?: Offering; badge?: number };

const farmerLinks: MenuLink[] = [
  { to: "/agricultor/produtos/novo", labelKey: "menu.farmer.addProduct", Icon: Store, requires: "products" },
  { to: "/agricultor/produtos", labelKey: "menu.farmer.myProducts", Icon: Boxes, requires: "products" },
  { to: "/agricultor/experiencias", labelKey: "menu.farmer.myExperiences", Icon: Tent, requires: "experiences" },
  { to: "/agricultor/alojamento", labelKey: "menu.farmer.myStays", Icon: BedDouble, requires: "stays" },
  { to: "/agricultor/subscricoes", labelKey: "menu.farmer.mySubscriptions", Icon: Repeat, requires: "subscriptions" },
  { to: "/agricultor/encomendas", labelKey: "menu.farmer.orders", Icon: Package },
  { to: "/agricultor/vendas", labelKey: "menu.farmer.mySales", Icon: TrendingUp },
  { to: "/agricultor/disponibilidade", labelKey: "menu.farmer.availability", Icon: Clock },
  { to: "/agricultor/scan", labelKey: "menu.farmer.validateDelivery", Icon: ScanLine },
];

const accountLinks = (isFarmer: boolean): MenuLink[] => [
  { to: "/perfil", labelKey: "menu.account.profile", Icon: UserCircle },
  ...(isFarmer
    ? [
        { to: "/agricultor/a-minha-pagina", labelKey: "menu.account.myPage", Icon: Eye } as MenuLink,
        { to: "/agricultor/informacoes", labelKey: "menu.account.farmInfo", Icon: ClipboardList } as MenuLink,
      ]
    : []),
  { to: "/definicoes", labelKey: "menu.account.settings", Icon: SettingsIcon },
];

// Tempo para o rato passar das riscas para o painel sem o menu fechar.
const CLOSE_DELAY_MS = 200;

/**
 * Menu lateral esquerdo: abre ao passar o rato pelas três riscas (ou com um
 * clique, no telemóvel e pelo teclado). Uma só lista de opções para o
 * computador e o telemóvel.
 */
const SideMenu = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, signOut, activeMode, canSwitchProfile, switchMode } = useAuth();
  const { totalCount } = useCart();
  const isFarmer = !!user && activeMode === "vendedor";
  const isClient = !!user && activeMode === "cliente";
  const offerings = useFarmerOfferings(isFarmer ? user?.id : null);

  // Fecha ao mudar de página e com a tecla Escape.
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  // Visitantes: no computador já têm tudo na barra de cima.
  if (!user && !isMobile) return null;

  // Enquanto as escolhas do agricultor carregam, só os atalhos que não dependem delas.
  const roleLinks: MenuLink[] = isFarmer
    ? farmerLinks.filter((l) => !l.requires || !!offerings?.[l.requires])
    : isClient
      ? [
          { to: "/encomendas", labelKey: "menu.client.myOrders", Icon: ShoppingBag },
          { to: "/carrinho", labelKey: "menu.client.cart", Icon: ShoppingCart, badge: totalCount },
          { to: "/favoritos", labelKey: "menu.client.favorites", Icon: Heart },
        ]
      : [];

  const renderLinks = (links: MenuLink[]) =>
    links.map(({ to, labelKey, Icon, badge }) => {
      const active = location.pathname === to;
      return (
        <Link
          key={to}
          to={to}
          onClick={() => setOpen(false)}
          aria-current={active ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary ${
            active ? "bg-primary/10 font-medium text-primary" : "text-foreground"
          }`}
        >
          <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
          <span className="flex-1">{t(labelKey)}</span>
          {!!badge && badge > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </Link>
      );
    });

  const sectionTitle = (text: string) => (
    <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{text}</p>
  );

  return (
    <div onMouseEnter={isMobile ? undefined : openNow} onMouseLeave={isMobile ? undefined : closeSoon}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("menu.button")}
        aria-expanded={open}
        aria-controls="side-menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Portal: o backdrop-blur do cabeçalho prenderia um painel fixo dentro dele.
          top-16 = altura do cabeçalho (Header.tsx). */}
      {createPortal(
        <>
          {/* No telemóvel, tocar fora fecha o menu. */}
          {open && isMobile && (
            <div className="fixed inset-x-0 bottom-0 top-16 z-40 bg-foreground/20" onClick={() => setOpen(false)} aria-hidden />
          )}
          <nav
            id="side-menu"
            aria-label={t("menu.mainAria")}
            onMouseEnter={isMobile ? undefined : openNow}
            onMouseLeave={isMobile ? undefined : closeSoon}
            className={`fixed bottom-0 left-0 top-16 z-50 w-72 max-w-[85vw] overflow-y-auto border-r border-border bg-background p-3 shadow-xl transition-transform duration-200 ${
              open ? "translate-x-0" : "pointer-events-none -translate-x-full"
            }`}
          >
        {sectionTitle(t("menu.sections.explore"))}
        {renderLinks(siteLinks.filter((l) => l.explore))}
        {isMobile && renderLinks(siteLinks.filter((l) => !l.explore))}
        {/* No telemóvel o seletor da barra de cima fica apertado; aqui tem espaço. */}
        {isMobile && (
          <div className="mt-2 flex items-center justify-between rounded-lg px-3 py-1 text-sm text-foreground">
            <span>{t("language.label")}</span>
            <LanguageSwitcher />
          </div>
        )}

        {user ? (
          <>
            {roleLinks.length > 0 && (
              <>
                {sectionTitle(isFarmer ? t("menu.sections.farmer") : t("menu.sections.client"))}
                {renderLinks(roleLinks)}
              </>
            )}

            {sectionTitle(t("menu.sections.account"))}
            {renderLinks(accountLinks(isFarmer))}

            {canSwitchProfile && (
              <>
                {sectionTitle(t("menu.sections.activeProfile"))}
                <div className="flex gap-1 rounded-lg bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => switchMode("vendedor")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      activeMode === "vendedor" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Store className="h-3.5 w-3.5" /> {t("menu.modeFarmer")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      switchMode("cliente");
                      navigate("/catalogo");
                    }}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      activeMode === "cliente" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" /> {t("menu.modeClient")}
                  </button>
                </div>
              </>
            )}

            <div className="my-2 border-t border-border" />
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                await signOut();
                navigate("/");
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" /> {t("menu.logout")}
            </button>
          </>
        ) : (
          <>
            <div className="my-2 border-t border-border" />
            {renderLinks([
              { to: "/auth", labelKey: "header.login", Icon: User },
              { to: "/auth?tab=signup", labelKey: "header.signup", Icon: UserCircle },
            ])}
          </>
        )}
          </nav>
        </>,
        document.body,
      )}
    </div>
  );
};

export default SideMenu;
