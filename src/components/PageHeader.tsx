import type { ReactNode } from "react";
import SectionHeading from "@/components/SectionHeading";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Área do site (ex.: "A minha conta", "Área do agricultor"). */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Botões à direita do título (ex.: "Adicionar produto"). */
  actions?: ReactNode;
  className?: string;
}

/** Cabeçalho de página partilhado: o mesmo aspeto em todas as páginas do site. */
const PageHeader = ({ eyebrow, title, description, actions, className }: PageHeaderProps) => (
  <header className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
    <SectionHeading as="h1" eyebrow={eyebrow} title={title} description={description} />
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

export default PageHeader;
