import { BedDouble, Info, LayoutGrid, Sprout, Tent, type LucideIcon } from "lucide-react";

/**
 * Páginas gerais: na barra de cima no computador. No menu lateral, as de
 * explorar aparecem sempre e as restantes só no telemóvel.
 * `labelKey`: chave de tradução em src/locales/<idioma>/common.json.
 */
export const siteLinks: {
  to: string;
  labelKey: "nav.catalog" | "nav.experiences" | "nav.stays" | "nav.about" | "nav.mission";
  Icon: LucideIcon;
  explore?: boolean;
}[] = [
  { to: "/catalogo", labelKey: "nav.catalog", Icon: LayoutGrid, explore: true },
  { to: "/experiencias", labelKey: "nav.experiences", Icon: Tent, explore: true },
  { to: "/alojamento", labelKey: "nav.stays", Icon: BedDouble, explore: true },
  { to: "/sobre", labelKey: "nav.about", Icon: Info },
  { to: "/missao", labelKey: "nav.mission", Icon: Sprout },
];
