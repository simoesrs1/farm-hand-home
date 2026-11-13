/** O que o agricultor disponibiliza na plataforma (farmer_details.offers_*). */
export type Offering = "products" | "experiences" | "stays";

export type Offerings = Record<Offering, boolean>;

export const OFFERINGS: { key: Offering; column: "offers_products" | "offers_experiences" | "offers_stays"; label: string; description: string }[] = [
  { key: "products", column: "offers_products", label: "Venda de produtos", description: "Produtos da quinta para levantamento ou entrega." },
  { key: "experiences", column: "offers_experiences", label: "Experiências", description: "Atividades na quinta, com sessões, reservas e brinde." },
  { key: "stays", column: "offers_stays", label: "Alojamento", description: "Quartos ou unidades de Alojamento Local ou Turismo no Espaço Rural." },
];

/** Evento para o menu voltar a ler as escolhas depois de serem alteradas. */
export const OFFERINGS_CHANGED_EVENT = "farmer-offerings-changed";
