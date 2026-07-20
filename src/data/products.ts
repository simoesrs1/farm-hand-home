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
  /** Stock inicial definido pelo agricultor. O stock disponível
   *  em tempo real é (stock - vendido), gerido pelo StockContext. */
  stock: number;
}
