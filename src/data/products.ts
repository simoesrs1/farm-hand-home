export interface Product {
  id: string;
  name: string;
  farmerId: string;
  farmer: string;
  price: number;
  unit: string;
  category: string;
  image: string;
  rating: number;
  reviews: number;
  location: string;
  region: string;
  deliveryMode?: "pickup" | "shipping" | "both";
  shippingDays?: number;
}

export const products: Product[] = [
  { id: "1", name: "Tomates Biológicos", farmerId: "quinta-do-vale-verde", farmer: "Quinta do Vale Verde", price: 3.5, unit: "kg", category: "Biológicos", image: "https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=400&h=300&fit=crop", rating: 4.9, reviews: 45, location: "Sintra", region: "Lisboa" },
  { id: "2", name: "Laranjas do Algarve", farmerId: "pomar-da-serra", farmer: "Pomar da Serra", price: 2.8, unit: "kg", category: "Frutas", image: "https://images.unsplash.com/photo-1547514701-42782101795e?w=400&h=300&fit=crop", rating: 4.7, reviews: 32, location: "Coimbra", region: "Centro" },
  { id: "3", name: "Azeite Extra Virgem", farmerId: "monte-alentejano", farmer: "Monte Alentejano", price: 8.9, unit: "L", category: "Azeite", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=300&fit=crop", rating: 4.8, reviews: 78, location: "Beja", region: "Alentejo" },
  { id: "4", name: "Mel de Rosmaninho", farmerId: "horta-da-avo-maria", farmer: "Horta da Avó Maria", price: 7.5, unit: "500g", category: "Mel", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop", rating: 4.9, reviews: 56, location: "Évora", region: "Alentejo" },
  { id: "5", name: "Alface Frisada", farmerId: "terras-do-minho", farmer: "Terras do Minho", price: 1.2, unit: "un", category: "Hortícolas", image: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&h=300&fit=crop", rating: 4.5, reviews: 21, location: "Braga", region: "Minho" },
  { id: "6", name: "Ovos de Campo", farmerId: "terras-do-minho", farmer: "Terras do Minho", price: 3.0, unit: "dúzia", category: "Ovos", image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=300&fit=crop", rating: 4.6, reviews: 38, location: "Braga", region: "Minho" },
  { id: "7", name: "Queijo de Cabra", farmerId: "jardins-do-douro", farmer: "Jardins do Douro", price: 6.5, unit: "300g", category: "Queijos", image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=300&fit=crop", rating: 4.7, reviews: 64, location: "Vila Real", region: "Trás-os-Montes" },
  { id: "8", name: "Manjericão Fresco", farmerId: "quinta-do-vale-verde", farmer: "Quinta do Vale Verde", price: 1.5, unit: "molho", category: "Ervas", image: "https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=400&h=300&fit=crop", rating: 4.4, reviews: 15, location: "Sintra", region: "Lisboa" },
  { id: "9", name: "Morangos Biológicos", farmerId: "quinta-do-vale-verde", farmer: "Quinta do Vale Verde", price: 4.5, unit: "500g", category: "Frutas", image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&h=300&fit=crop", rating: 4.8, reviews: 52, location: "Sintra", region: "Lisboa" },
  { id: "10", name: "Compota de Figo", farmerId: "horta-da-avo-maria", farmer: "Horta da Avó Maria", price: 5.0, unit: "250g", category: "Compotas", image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop", rating: 4.9, reviews: 41, location: "Évora", region: "Alentejo" },
  { id: "11", name: "Azeitonas Temperadas", farmerId: "monte-alentejano", farmer: "Monte Alentejano", price: 4.0, unit: "500g", category: "Azeitonas", image: "https://images.unsplash.com/photo-1593030668930-8130abedd2b0?w=400&h=300&fit=crop", rating: 4.6, reviews: 29, location: "Beja", region: "Alentejo" },
  { id: "12", name: "Nozes da Serra", farmerId: "pomar-da-serra", farmer: "Pomar da Serra", price: 6.0, unit: "500g", category: "Frutas", image: "https://images.unsplash.com/photo-1563412885-9e87c0e5f1d8?w=400&h=300&fit=crop", rating: 4.5, reviews: 18, location: "Coimbra", region: "Centro" },
];
