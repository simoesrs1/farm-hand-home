/** O que o agricultor disponibiliza na plataforma (farmer_details.offers_*). */
import i18n from "@/i18n";
export type Offering = "products" | "experiences" | "stays" | "subscriptions";

export type Offerings = Record<Offering, boolean>;

type OfferingColumn = "offers_products" | "offers_experiences" | "offers_stays" | "offers_subscriptions";

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
  offering("subscriptions", "offers_subscriptions"),
];

/** Colunas de farmer_details com as escolhas (para o select). */
export const OFFERING_COLUMNS = "offers_products, offers_experiences, offers_stays, offers_subscriptions" as const;

type OfferingRow = Record<OfferingColumn, boolean>;

export const NO_OFFERINGS: Offerings = { products: false, experiences: false, stays: false, subscriptions: false };

export const offeringsFromRow = (row: OfferingRow): Offerings => ({
  products: row.offers_products,
  experiences: row.offers_experiences,
  stays: row.offers_stays,
  subscriptions: row.offers_subscriptions,
});

export const offeringsToRow = (value: Offerings): OfferingRow => ({
  offers_products: value.products,
  offers_experiences: value.experiences,
  offers_stays: value.stays,
  offers_subscriptions: value.subscriptions,
});

/** Pelo menos uma escolha (regra também na base de dados). */
export const hasAnyOffering = (value: Offerings) => OFFERINGS.some((o) => value[o.key]);

/** Evento para o menu voltar a ler as escolhas depois de serem alteradas. */
export const OFFERINGS_CHANGED_EVENT = "farmer-offerings-changed";
