export interface Farmer {
  id: string;
  name: string;
  farm: string;
  image: string;
  rating: number;
  reviews: number;
  location: string;
  region: string;
  products: string[];
  description: string;
}

export const farmers: Farmer[] = [
  {
    id: "quinta-do-vale-verde",
    name: "António Silva",
    farm: "Quinta do Vale Verde",
    image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&h=400&fit=crop",
    rating: 4.8,
    reviews: 127,
    location: "Sintra",
    region: "Lisboa",
    products: ["Hortícolas", "Frutas", "Biológicos"],
    description: "Agricultura biológica desde 1998 nas encostas da Serra de Sintra. Especialista em hortícolas de época e frutas da região.",
  },
  {
    id: "horta-da-avo-maria",
    name: "Maria Santos",
    farm: "Horta da Avó Maria",
    image: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=600&h=400&fit=crop",
    rating: 4.9,
    reviews: 89,
    location: "Évora",
    region: "Alentejo",
    products: ["Frutas", "Mel", "Compotas"],
    description: "Produção artesanal de mel de rosmaninho e compotas caseiras no coração do Alentejo, seguindo receitas de três gerações.",
  },
  {
    id: "monte-alentejano",
    name: "João Ferreira",
    farm: "Monte Alentejano",
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&h=400&fit=crop",
    rating: 4.7,
    reviews: 203,
    location: "Beja",
    region: "Alentejo",
    products: ["Azeite", "Azeitonas", "Ervas"],
    description: "Azeite extra virgem premiado, produzido a partir de oliveiras centenárias nas planícies alentejanas.",
  },
  {
    id: "jardins-do-douro",
    name: "Clara Oliveira",
    farm: "Jardins do Douro",
    image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&h=400&fit=crop",
    rating: 4.6,
    reviews: 156,
    location: "Vila Real",
    region: "Trás-os-Montes",
    products: ["Vinho", "Uvas", "Queijos"],
    description: "Vinhos e queijos artesanais do Alto Douro Vinhateiro, região classificada como Património da Humanidade.",
  },
  {
    id: "terras-do-minho",
    name: "Pedro Rodrigues",
    farm: "Terras do Minho",
    image: "https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=600&h=400&fit=crop",
    rating: 4.8,
    reviews: 74,
    location: "Braga",
    region: "Minho",
    products: ["Biológicos", "Hortícolas", "Ovos"],
    description: "Produção 100% biológica certificada no verde Minho, com ovos de galinhas criadas ao ar livre.",
  },
  {
    id: "pomar-da-serra",
    name: "Ana Costa",
    farm: "Pomar da Serra",
    image: "https://images.unsplash.com/photo-1595855759920-86582396756a?w=600&h=400&fit=crop",
    rating: 4.5,
    reviews: 98,
    location: "Coimbra",
    region: "Centro",
    products: ["Frutas", "Nozes", "Mel"],
    description: "Frutas de pomar e frutos secos cultivados na Serra da Lousã, com práticas de agricultura sustentável.",
  },
];
