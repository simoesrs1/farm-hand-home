/**
 * Dados da entidade que explora a plataforma, usados nos Termos e na Política
 * de Privacidade. Os campos entre [ ] têm de ser preenchidos antes de publicar.
 */
export const LEGAL = {
  brand: "ValorRural",
  companyName: "[Denominação social]",
  nipc: "[NIPC]",
  address: "[Morada da sede]",
  email: "info@valorrural.pt",
  phone: "+351 912 345 678",
  /** Data da versão em vigor dos documentos legais (AAAA-MM-DD; mostrada no idioma do site). */
  lastUpdated: "2026-11-21",
  /** Percentagem retida pela plataforma em cada encomenda (create-order). */
  commissionPercent: 10,
  /** Entrega de subscrição não feita (queixa aceite): indemnização ao cliente e multa ao agricultor.
   *  Iguais a on_delivery_complaint_decision (supabase/migrations/20261121150000_subscricoes.sql). */
  subscriptionCompensationPercent: 20,
  subscriptionFinePercent: 10,
} as const;
