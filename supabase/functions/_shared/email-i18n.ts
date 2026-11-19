// Textos dos emails nos cinco idiomas do site. O idioma vem de
// profiles.preferred_language (escolhido no seletor de idioma); sem ele, português.

export type EmailLang = "pt" | "en" | "de" | "es" | "fr";

const LANGS: EmailLang[] = ["pt", "en", "de", "es", "fr"];

export const toEmailLang = (value: unknown): EmailLang =>
  LANGS.includes(value as EmailLang) ? (value as EmailLang) : "pt";

/** Lembretes semanais ao agricultor (farmer-activity). */
export type NudgeEmail =
  | { kind: "pending"; count: number }
  | { kind: "chat" }
  | { kind: "firstProduct" }
  | { kind: "stale"; days: number };

type NudgeTexts = {
  pending: (count: number) => { subject: string; body: string };
  chat: { subject: string; body: string };
  firstProduct: { subject: string; body: string };
  stale: (days: number) => { subject: string; body: string };
  open: string;
};

const NUDGES: Record<EmailLang, NudgeTexts> = {
  pt: {
    pending: (n) => ({
      subject: n === 1 ? "Tens uma encomenda por aceitar" : `Tens ${n} encomendas por aceitar`,
      body: "Aceitar depressa deixa os clientes descansados e faz-te subir no catálogo.",
    }),
    chat: {
      subject: "Um cliente está à espera da tua resposta",
      body: "Responder no chat em menos de 24 horas conta para a tua pontuação de atividade.",
    },
    firstProduct: {
      subject: "Adiciona o teu primeiro produto",
      body: "Os clientes ainda não conseguem comprar-te nada. Demora poucos minutos a criar um produto.",
    },
    stale: (d) => ({
      subject: "Os teus produtos estão atualizados?",
      body: `Não mexes no catálogo há ${d} dias. Confirma o stock para subires no catálogo.`,
    }),
    open: "Abrir o ValorRural",
  },
  en: {
    pending: (n) => ({
      subject: n === 1 ? "You have an order to accept" : `You have ${n} orders to accept`,
      body: "Accepting quickly reassures customers and helps you rise in the catalogue.",
    }),
    chat: {
      subject: "A customer is waiting for your reply",
      body: "Replying in the chat within 24 hours counts towards your activity score.",
    },
    firstProduct: {
      subject: "Add your first product",
      body: "Customers can't buy anything from you yet. Creating a product only takes a few minutes.",
    },
    stale: (d) => ({
      subject: "Are your products up to date?",
      body: `You haven't updated your catalogue for ${d} days. Confirm your stock to rise in the catalogue.`,
    }),
    open: "Open ValorRural",
  },
  de: {
    pending: (n) => ({
      subject: n === 1 ? "Du hast eine Bestellung anzunehmen" : `Du hast ${n} Bestellungen anzunehmen`,
      body: "Schnelles Annehmen beruhigt die Kunden und lässt dich im Katalog aufsteigen.",
    }),
    chat: {
      subject: "Ein Kunde wartet auf deine Antwort",
      body: "Eine Antwort im Chat innerhalb von 24 Stunden zählt für deine Aktivitätspunktzahl.",
    },
    firstProduct: {
      subject: "Füge dein erstes Produkt hinzu",
      body: "Kunden können noch nichts bei dir kaufen. Ein Produkt anzulegen dauert nur wenige Minuten.",
    },
    stale: (d) => ({
      subject: "Sind deine Produkte aktuell?",
      body: `Du hast deinen Katalog seit ${d} Tagen nicht aktualisiert. Bestätige deinen Bestand, um im Katalog aufzusteigen.`,
    }),
    open: "ValorRural öffnen",
  },
  es: {
    pending: (n) => ({
      subject: n === 1 ? "Tienes un pedido por aceptar" : `Tienes ${n} pedidos por aceptar`,
      body: "Aceptar rápido tranquiliza a los clientes y te hace subir en el catálogo.",
    }),
    chat: {
      subject: "Un cliente está esperando tu respuesta",
      body: "Responder en el chat en menos de 24 horas cuenta para tu puntuación de actividad.",
    },
    firstProduct: {
      subject: "Añade tu primer producto",
      body: "Los clientes todavía no pueden comprarte nada. Crear un producto solo lleva unos minutos.",
    },
    stale: (d) => ({
      subject: "¿Tus productos están actualizados?",
      body: `No actualizas el catálogo desde hace ${d} días. Confirma el stock para subir en el catálogo.`,
    }),
    open: "Abrir ValorRural",
  },
  fr: {
    pending: (n) => ({
      subject: n === 1 ? "Tu as une commande à accepter" : `Tu as ${n} commandes à accepter`,
      body: "Accepter rapidement rassure les clients et te fait monter dans le catalogue.",
    }),
    chat: {
      subject: "Un client attend ta réponse",
      body: "Répondre dans le chat en moins de 24 heures compte pour ton score d'activité.",
    },
    firstProduct: {
      subject: "Ajoute ton premier produit",
      body: "Les clients ne peuvent encore rien t'acheter. Créer un produit ne prend que quelques minutes.",
    },
    stale: (d) => ({
      subject: "Tes produits sont-ils à jour ?",
      body: `Tu n'as pas mis à jour ton catalogue depuis ${d} jours. Confirme ton stock pour monter dans le catalogue.`,
    }),
    open: "Ouvrir ValorRural",
  },
};

/** Assunto, texto e rótulo da ligação de um lembrete, no idioma da pessoa. */
export function nudgeEmail(lang: EmailLang, nudge: NudgeEmail): { subject: string; body: string; open: string } {
  const t = NUDGES[lang];
  const texts =
    nudge.kind === "pending" ? t.pending(nudge.count)
    : nudge.kind === "stale" ? t.stale(nudge.days)
    : t[nudge.kind];
  return { ...texts, open: t.open };
}
