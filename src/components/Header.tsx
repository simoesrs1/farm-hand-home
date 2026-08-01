import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, ShoppingCart, Package, ScanLine, ShoppingBag, ChevronDown, Settings as SettingsIcon, Heart, UserCircle, Store, ClipboardList, Boxes } from "lucide-react";
import logoFarmConnect from "@/assets/logo-farmconnect.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import NotificationBell from "@/components/NotificationBell";

const navLinks = [
  { to: "/", label: "Início" },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/sobre", label: "Sobre Nós" },
  { to: "/missao", label: "Missão" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, activeMode, canSwitchProfile, switchMode } = useAuth();
  const { totalCount } = useCart();
  const isFarmer = !!user && activeMode === "vendedor";
  const isClient = !!user && activeMode === "cliente";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-primary transition-transform group-hover:scale-105">
            <img src={logoFarmConnect} alt="FarmConnect logo" width={40} height={40} className="h-full w-full object-cover" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Farm<span className="text-primary">Connect</span>
          </span>
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
              {isFarmer && (
                <>
                  <Link
                    to="/agricultor/produtos/novo"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary"
                    aria-label="Adicionar produto"
                    title="Adicionar produto"
                  >
                    <Store className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/agricultor/produtos"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary"
                    aria-label="Os meus produtos"
                    title="Os meus produtos"
                  >
                    <Boxes className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/agricultor/encomendas"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary"
                    aria-label="Encomendas"
                    title="Encomendas"
                  >
                    <Package className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/agricultor/scan"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary"
                    aria-label="Validar entrega"
                    title="Validar entrega"
                  >
                    <ScanLine className="h-5 w-5" />
                  </Link>
                </>
              )}
              <NotificationBell />
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
                  <Link
                    to="/perfil"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    <UserCircle className="h-4 w-4 text-muted-foreground" />
                    Perfil
                  </Link>
                  {isFarmer && (
                    <Link
                      to="/agricultor/informacoes"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      Informações da exploração
                    </Link>
                  )}
                  <Link
                    to="/definicoes"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                    Definições
                  </Link>
                  {isClient && (
                    <Link
                      to="/favoritos"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      Favoritos
                    </Link>
                  )}
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

        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
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
