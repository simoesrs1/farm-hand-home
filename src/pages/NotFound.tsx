import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="py-24">
      <div className="container flex max-w-2xl flex-col items-center text-center">
        <PageHeader
          className="justify-center"
          eyebrow="Erro 404"
          title="Esta página não existe"
          description="A ligação pode estar errada ou a página foi removida."
        />
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/">Voltar ao início</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/catalogo">Ver catálogo</Link>
          </Button>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
