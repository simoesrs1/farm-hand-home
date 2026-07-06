export interface Category {
  name: string;
  slug: string;
  image: string;
}

export const categories: Category[] = [
  { name: "Bebidas", slug: "bebidas", image: "https://images.unsplash.com/photo-1632313911469-4b07c534ea16?w=600&h=400&fit=crop" },
  { name: "Carne", slug: "carne", image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&h=400&fit=crop" },
  { name: "Cereais", slug: "cereais", image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&h=400&fit=crop" },
  { name: "Charcutaria", slug: "charcutaria", image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop" },
  { name: "Cogumelos", slug: "cogumelos", image: "https://plus.unsplash.com/premium_photo-1758367455121-85bdda191d63?w=600&h=400&fit=crop" },
  { name: "Conservas", slug: "conservas", image: "https://images.unsplash.com/photo-1640348784724-93f7b14d8047?w=600&h=400&fit=crop" },
  { name: "Ervas aromáticas", slug: "ervas-aromaticas", image: "https://plus.unsplash.com/premium_photo-1764112640787-4b47a4d5d009?w=600&h=400&fit=crop" },
  { name: "Flores", slug: "flores", image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=600&h=400&fit=crop" },
  { name: "Fruta", slug: "fruta", image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&h=400&fit=crop" },
  { name: "Frutos Secos", slug: "frutos-secos", image: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600&h=400&fit=crop" },
  { name: "Gorduras", slug: "gorduras", image: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600&h=400&fit=crop" },
  { name: "Halófitas", slug: "halofitas", image: "https://images.unsplash.com/photo-1567375698348-5d9d5ae99de0?w=600&h=400&fit=crop" },
  { name: "Hortícolas", slug: "horticolas", image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=400&fit=crop" },
  { name: "Laticínios", slug: "laticinios", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&h=400&fit=crop" },
  { name: "Leguminosas", slug: "leguminosas", image: "https://images.unsplash.com/photo-1775259608525-cf332eaf89d3?w=600&h=400&fit=crop" },
  { name: "Mel", slug: "mel", image: "https://plus.unsplash.com/premium_photo-1764409849452-3129a4eb2a9c?w=600&h=400&fit=crop" },
  { name: "Óleos essenciais", slug: "oleos-essenciais", image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&h=400&fit=crop" },
  { name: "Outros produtos", slug: "outros-produtos", image: "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=600&h=400&fit=crop" },
  { name: "Ovos", slug: "ovos", image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&h=400&fit=crop" },
  { name: "Pão artesanal", slug: "pao-artesanal", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=400&fit=crop" },
  { name: "Salgados", slug: "salgados", image: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=600&h=400&fit=crop" },
  { name: "Temperos e especiarias", slug: "temperos-e-especiarias", image: "https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=600&h=400&fit=crop" },
];

export const getCategoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);
