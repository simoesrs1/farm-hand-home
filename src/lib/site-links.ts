import { BedDouble, Info, LayoutGrid, Sprout, Tent, type LucideIcon } from "lucide-react";

/**
 * Páginas gerais: na barra de cima no computador. No menu lateral, as de
 * explorar aparecem sempre e as restantes só no telemóvel.
 */
export const siteLinks: { to: string; label: string; Icon: LucideIcon; explore?: boolean }[] = [
  { to: "/catalogo", label: "Catálogo", Icon: LayoutGrid, explore: true },
  { to: "/experiencias", label: "Experiências", Icon: Tent, explore: true },
  { to: "/alojamento", label: "Alojamento", Icon: BedDouble, explore: true },
  { to: "/sobre", label: "Sobre Nós", Icon: Info },
  { to: "/missao", label: "Missão", Icon: Sprout },
];
