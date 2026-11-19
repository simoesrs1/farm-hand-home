/** O que o agricultor disponibiliza na plataforma (farmer_details.offers_*). */
import i18n from "@/i18n";
export type Offering = "products" | "experiences" | "stays";

export type Offerings = Record<Offering, boolean>;

type OfferingColumn = "offers_products" | "offers_experiences" | "offers_stays";

const offering = (key: Offering, column: OfferingColumn) => ({
  key,
  column,
  get label() {
    return i18n.t(`common:offerings.${key}.label`);
  },
  get description() {
    return i18n.t(`common:offerings.${key}.description`);
  },
});

export const OFFERINGS: { key: Offering; column: OfferingColumn; label: string; description: string }[] = [
  offering("products", "offers_products"),
  offering("experiences", "offers_experiences"),
  offering("stays", "offers_stays"),
];

/** Evento para o menu voltar a ler as escolhas depois de serem alteradas. */
export const OFFERINGS_CHANGED_EVENT = "farmer-offerings-changed";
