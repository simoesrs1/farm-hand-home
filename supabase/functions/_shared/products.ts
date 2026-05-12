// Server-side authoritative product catalog. Mirrors src/data/products.ts.
// Prices here are the ONLY trusted prices for order creation.
export interface CatalogProduct {
  id: string;
  name: string;
  farmerId: string;
  price: number;
  unit: string;
  image: string;
}

export const CATALOG: Record<string, CatalogProduct> = {
  "1":  { id: "1",  name: "Tomates Biológicos",   farmerId: "quinta-do-vale-verde", price: 3.5, unit: "kg",     image: "" },
  "2":  { id: "2",  name: "Laranjas do Algarve",  farmerId: "pomar-da-serra",       price: 2.8, unit: "kg",     image: "" },
  "3":  { id: "3",  name: "Azeite Extra Virgem",  farmerId: "monte-alentejano",     price: 8.9, unit: "L",      image: "" },
  "4":  { id: "4",  name: "Mel de Rosmaninho",    farmerId: "horta-da-avo-maria",   price: 7.5, unit: "500g",   image: "" },
  "5":  { id: "5",  name: "Alface Frisada",       farmerId: "terras-do-minho",      price: 1.2, unit: "un",     image: "" },
  "6":  { id: "6",  name: "Ovos de Campo",        farmerId: "terras-do-minho",      price: 3.0, unit: "dúzia",  image: "" },
  "7":  { id: "7",  name: "Queijo de Cabra",      farmerId: "jardins-do-douro",     price: 6.5, unit: "300g",   image: "" },
  "8":  { id: "8",  name: "Manjericão Fresco",    farmerId: "quinta-do-vale-verde", price: 1.5, unit: "molho",  image: "" },
  "9":  { id: "9",  name: "Morangos Biológicos",  farmerId: "quinta-do-vale-verde", price: 4.5, unit: "500g",   image: "" },
  "10": { id: "10", name: "Compota de Figo",      farmerId: "horta-da-avo-maria",   price: 5.0, unit: "250g",   image: "" },
  "11": { id: "11", name: "Azeitonas Temperadas", farmerId: "monte-alentejano",     price: 4.0, unit: "500g",   image: "" },
  "12": { id: "12", name: "Nozes da Serra",       farmerId: "pomar-da-serra",       price: 6.0, unit: "500g",   image: "" },
};
