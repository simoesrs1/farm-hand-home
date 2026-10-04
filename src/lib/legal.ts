/**
 * Dados da entidade que explora a plataforma, usados nos Termos e na Política
 * de Privacidade. Os campos entre [ ] têm de ser preenchidos antes de publicar.
 */
export const LEGAL = {
  brand: "FarmConnect",
  companyName: "[Denominação social]",
  nipc: "[NIPC]",
  address: "[Morada da sede]",
  email: "info@farmconnect.pt",
  phone: "+351 912 345 678",
  /** Data da versão em vigor dos documentos legais. */
  lastUpdated: "3 de outubro de 2026",
  /** Percentagem retida pela plataforma em cada encomenda (create-order). */
  commissionPercent: 10,
} as const;
