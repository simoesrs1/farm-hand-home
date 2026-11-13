import { Info, LayoutGrid, Sprout, type LucideIcon } from "lucide-react";

/** Páginas gerais: na barra de cima no computador, no menu lateral no telemóvel. */
export const siteLinks: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: "/catalogo", label: "Catálogo", Icon: LayoutGrid },
  { to: "/sobre", label: "Sobre Nós", Icon: Info },
  { to: "/missao", label: "Missão", Icon: Sprout },
];
