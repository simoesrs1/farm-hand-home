import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, ShoppingCart, Package, ScanLine, ShoppingBag, ChevronDown, Settings as SettingsIcon, Heart, UserCircle, Store, ClipboardList, Boxes, Clock, TrendingUp, Eye, Tent, BedDouble, type LucideIcon } from "lucide-react";
import logoValorRural from "@/assets/logo-valorrural-horizontal.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import NotificationBell from "@/components/NotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFarmerOfferings } from "@/hooks/useFarmerOfferings";
import type { Offering } from "@/lib/farmer-offerings";

const navLinks = [
  { to: "/", label: "Início" },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/sobre", label: "Sobre Nós" },
  { to: "/missao", label: "Missão" },
];

// `requires`: só aparece se o agricultor disponibilizar essa opção.
type MenuLink = { to: string; label: string; Icon: LucideIcon; requires?: Offering };

// Uma só lista para o computador e o telemóvel, para os dois menus não divergirem.
// Atalhos do agricultor: ícones na barra no computador, lista no menu móvel.
const farmerLinks: MenuLink[] = [
  { to: "/agricultor/produtos/novo", label: "Adicionar produto", Icon: Store, requires: "products" },
  { to: "/agricultor/produtos", label: "Os meus produtos", Icon: Boxes, requires: "products" },
  { to: "/agricultor/experiencias", label: "As minhas experiências", Icon: Tent, requires: "experiences" },
  { to: "/agricultor/alojamento", label: "O meu alojamento", Icon: BedDouble, requires: "stays" },
  { to: "/agricultor/encomendas", label: "Encomendas", Icon: Package },
  { to: "/agricultor/vendas", label: "As minhas vendas", Icon: TrendingUp },
  { to: "/agricultor/disponibilidade", label: "Disponibilidade (porta aberta)", Icon: Clock },
  { to: "/agricultor/scan", label: "Validar entrega", Icon: ScanLine },
];

// Opções da conta (menu do nome no computador).
const accountLinks = (isFarmer: boolean, isClient: boolean): MenuLink[] => [
  { to: "/perfil", label: "Perfil", Icon: UserCircle },
  ...(isFarmer
    ? [
        { to: "/agricultor/a-minha-pagina", label: "Ver a minha página", Icon: Eye },
        { to: "/agricultor/informacoes", label: "Informações da exploração", Icon: ClipboardList },
      ]
    : []),
  { to: "/definicoes", label: "Definições", Icon: SettingsIcon },
  ...(isClient ? [{ to: "/favoritos", label: "Favoritos", Icon: Heart }] : []),
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, activeMode, canSwitchProfile, switchMode } = useAuth();
  const { totalCount } = useCart();
  // Um só sino montado de cada vez: as duas cópias abririam o mesmo canal em tempo real.
  const isMobile = useIsMobile();
  const isFarmer = !!user && activeMode === "vendedor";
  const isClient = !!user && activeMode === "cliente";
  const offerings = useFarmerOfferings(isFarmer ? user?.id : null);
  // Enquanto as escolhas carregam, só os atalhos que não dependem delas.
  const visibleFarmerLinks = farmerLinks.filter((l) => !l.requires || !!offerings?.[l.requires]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center group" aria-label="ValorRural — início">
          <img
            src={logoValorRural}
            alt="ValorRural — A Tua Conexão Direta com a Quinta"
            width={903}
            height={240}
            className="h-9 w-auto transition-transform group-hover:scale-[1.03] sm:h-10"
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary ${
                location.pathname === link.to ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {isClient && (
                <>
                  <Link
                    to="/encomendas"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary"
                    aria-label="As minhas encomendas"
                    title="As minhas encomendas"
                  >
                    <ShoppingBag className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/carrinho"
                    className="relative flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary"
                    aria-label="Carrinho"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {totalCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {totalCount > 99 ? "99+" : totalCount}
                      </span>
                    )}
                  </Link>
                </>
              )}
              {isFarmer &&
                visibleFarmerLinks.map(({ to, label, Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary"
                    aria-label={label}
                    title={label}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                ))}
              {!isMobile && <NotificationBell />}
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <UserCircle className="h-4 w-4 text-primary" />
                  <span className="max-w-[10rem] truncate">
                    {profile?.full_name || user.email}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:rotate-180" />
                </button>
                {/* Bridge to keep hover continuous */}
                <div className="absolute right-0 top-full h-2 w-56" />
                <div className="invisible absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 origin-top-right scale-95 rounded-xl border border-border bg-popover p-1.5 opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:scale-100 group-hover:opacity-100 group-focus-within:visible group-focus-within:scale-100 group-focus-within:opacity-100">
                  {canSwitchProfile && (
                    <>
                      <div className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Perfil ativo
                      </div>
                      <div className="mb-1 flex gap-1 rounded-lg bg-muted p-1">
                        <button
                          type="button"
                          onClick={() => switchMode("vendedor")}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                            activeMode === "vendedor"
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Store className="h-3.5 w-3.5" />
                          Agricultor
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            switchMode("cliente");
                            navigate("/catalogo");
                          }}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                            activeMode === "cliente"
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          Cliente
                        </button>
                      </div>
                      <div className="my-1 border-t border-border" />
                    </>
                  )}
                  {accountLinks(isFarmer, isClient).map(({ to, label, Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {label}
                    </Link>
                  ))}
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  Entrar
                </Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button size="sm">Registar</Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          {user && isMobile && <NotificationBell />}
          <button
            className="p-2 text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background p-4 md:hidden animate-fade-in">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary ${
                  location.pathname === link.to ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              {user ? (
                <>
                  <span className="px-3 text-sm text-muted-foreground">
                    {profile?.full_name || user.email}
                  </span>
                  {canSwitchProfile && (
                    <div className="flex gap-1 rounded-lg bg-muted p-1">
                      <button
                        type="button"
                        onClick={() => switchMode("vendedor")}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                          activeMode === "vendedor" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                        }`}
                      >
                        <Store className="h-3.5 w-3.5" />
                        Agricultor
                      </button>
                      <button
                        type="button"
                        onClick={() => { switchMode("cliente"); setMobileOpen(false); navigate("/catalogo"); }}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                          activeMode === "cliente" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                        }`}
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Cliente
                      </button>
                    </div>
                  )}
                  {isClient && (
                    <Link
                      to="/encomendas"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      As minhas encomendas
                    </Link>
                  )}
                  {isClient && (
                    <Link to="/carrinho" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4" />
                          Carrinho
                        </span>
                        {totalCount > 0 && (
                          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                            {totalCount}
                          </span>
                        )}
                      </Button>
                    </Link>
                  )}
                  {[...(isFarmer ? visibleFarmerLinks : []), ...accountLinks(isFarmer, isClient)].map(({ to, label, Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary ${
                        location.pathname === to ? "text-primary" : "text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {label}
                    </Link>
                  ))}
                  <Button variant="outline" className="w-full gap-2" onClick={() => { handleSignOut(); setMobileOpen(false); }}>
                    <LogOut className="h-4 w-4" />
                    Sair
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full gap-2">
                      <User className="h-4 w-4" />
                      Entrar
                    </Button>
                  </Link>
                  <Link to="/auth?tab=signup" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full">Registar</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
