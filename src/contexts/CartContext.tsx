import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Product } from "@/data/products";
import { useConsent } from "@/contexts/ConsentContext";
import { scopedStorage, STORAGE_KEYS } from "@/lib/consent";

export interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  totalCount: number;
  totalPrice: number;
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType>({
  items: [],
  totalCount: 0,
  totalPrice: 0,
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { hasConsent } = useConsent();
  const prefsAllowed = hasConsent("preferences");

  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = scopedStorage.get<CartItem[]>(STORAGE_KEYS.cart);
    return Array.isArray(stored) ? stored : [];
  });

  // Ao aceitar as preferências, recuperar o carrinho de uma visita anterior.
  useEffect(() => {
    if (!prefsAllowed) return;
    const previous = scopedStorage.restore<CartItem[]>(STORAGE_KEYS.cart);
    if (Array.isArray(previous) && previous.length > 0) {
      setItems((current) => (current.length > 0 ? current : previous));
    }
  }, [prefsAllowed]);

  useEffect(() => {
    scopedStorage.set(STORAGE_KEYS.cart, items);
  }, [items]);

  const addItem = (product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity } : i)),
    );
  };

  const clearCart = () => setItems([]);

  const totalCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const totalPrice = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, totalCount, totalPrice, addItem, removeItem, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
};
