import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useConsent } from "@/contexts/ConsentContext";

const Footer = () => {
  const { openPreferences } = useConsent();
  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Leaf className="h-4 w-4" />
              </div>
              <span className="font-display text-lg font-bold text-foreground">FarmConnect</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Conectando consumidores a agricultores locais com transparência e confiança.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Navegar</h4>
            <div className="flex flex-col gap-2">
              <Link to="/catalogo" className="text-sm text-muted-foreground hover:text-primary transition-colors">Catálogo</Link>
              <Link to="/sobre" className="text-sm text-muted-foreground hover:text-primary transition-colors">Sobre Nós</Link>
              <Link to="/missao" className="text-sm text-muted-foreground hover:text-primary transition-colors">Missão</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Conta</h4>
            <div className="flex flex-col gap-2">
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors">Entrar</Link>
              <Link to="/auth?tab=signup" className="text-sm text-muted-foreground hover:text-primary transition-colors">Registar</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Contacto</h4>
            <p className="text-sm text-muted-foreground">info@farmconnect.pt</p>
            <p className="text-sm text-muted-foreground">+351 912 345 678</p>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:justify-between">
          <span>© 2026 FarmConnect. Todos os direitos reservados.</span>
          <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link to="/termos" className="hover:text-primary transition-colors">Termos e Condições</Link>
            <Link to="/privacidade" className="hover:text-primary transition-colors">Política de Privacidade</Link>
            <button type="button" onClick={openPreferences} className="hover:text-primary transition-colors">
              Gerir cookies
            </button>
            <a
              href="https://www.livroreclamacoes.pt"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Livro de Reclamações
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
