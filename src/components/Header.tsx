import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, User, UserCircle } from "lucide-react";
import logoValorRural from "@/assets/logo-valorrural-horizontal.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import NotificationBell from "@/components/NotificationBell";
import SideMenu from "@/components/SideMenu";
import { siteLinks } from "@/lib/site-links";

/**
 * Barra de cima: as três riscas do menu lateral à esquerda do logótipo, as
 * páginas gerais e, à direita, notificações, carrinho e nome. As opções do
 * cliente e do agricultor estão no menu lateral (SideMenu).
 */
const Header = () => {
  const location = useLocation();
  const { user, profile, activeMode } = useAuth();
  const { totalCount } = useCart();
  const isClient = !!user && activeMode === "cliente";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      {/* h-16: o menu lateral começa logo abaixo (SideMenu.tsx). */}
      <div className="container flex h-16 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SideMenu />
          <Link to="/" className="group flex items-center" aria-label="ValorRural — início">
            <img
              src={logoValorRural}
              alt="ValorRural — A Tua Conexão Direta com a Quinta"
              width={903}
              height={240}
              className="h-9 w-auto transition-transform group-hover:scale-[1.03] sm:h-10"
            />
          </Link>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {siteLinks.map((link) => (
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

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isClient && (
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
              )}
              <NotificationBell />
              <Link
                to="/perfil"
                className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary md:flex"
              >
                <UserCircle className="h-4 w-4 text-primary" />
                <span className="max-w-[10rem] truncate">{profile?.full_name || user.email}</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  Entrar
                </Button>
              </Link>
              <Link to="/auth?tab=signup" className="hidden sm:block">
                <Button size="sm">Registar</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
