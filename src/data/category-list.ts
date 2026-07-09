export interface CategoryBase {
  name: string;
  slug: string;
}

export const categoryList: CategoryBase[] = [
  { name: "Bebidas", slug: "bebidas" },
  { name: "Carne", slug: "carne" },
  { name: "Cereais", slug: "cereais" },
  { name: "Charcutaria", slug: "charcutaria" },
  { name: "Cogumelos", slug: "cogumelos" },
  { name: "Conservas", slug: "conservas" },
  { name: "Ervas aromáticas", slug: "ervas-aromaticas" },
  { name: "Flores", slug: "flores" },
  { name: "Fruta", slug: "fruta" },
  { name: "Frutos Secos", slug: "frutos-secos" },
  { name: "Gorduras", slug: "gorduras" },
  { name: "Halófitas", slug: "halofitas" },
  { name: "Hortícolas", slug: "horticolas" },
  { name: "Laticínios", slug: "laticinios" },
  { name: "Leguminosas", slug: "leguminosas" },
  { name: "Mel", slug: "mel" },
  { name: "Óleos essenciais", slug: "oleos-essenciais" },
  { name: "Outros produtos", slug: "outros-produtos" },
  { name: "Ovos", slug: "ovos" },
  { name: "Pão artesanal", slug: "pao-artesanal" },
  { name: "Salgados", slug: "salgados" },
  { name: "Temperos e especiarias", slug: "temperos-e-especiarias" },
];
