import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { products as CATALOG } from "@/data/products";

interface StockContextType {
  /** Unidades disponíveis (stock inicial - já vendido). */
  getAvailable: (productId: string) => number;
  /** Regista uma venda, decrementando o stock disponível. */
  consume: (entries: { id: string; quantity: number }[]) => void;
}

const StockContext = createContext<StockContextType>({
  getAvailable: () => 0,
  consume: () => {},
});

export const useStock = () => useContext(StockContext);

const STORAGE_KEY = "farmconnect_stock_sold_v1";

type SoldMap = Record<string, number>;

export const StockProvider = ({ children }: { children: ReactNode }) => {
  const [sold, setSold] = useState<SoldMap>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SoldMap) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sold));
    } catch {
      /* ignore */
    }
  }, [sold]);

  const initialById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of CATALOG) map[p.id] = p.stock;
    return map;
  }, []);

  const getAvailable = useCallback(
    (productId: string) => {
      const initial = initialById[productId] ?? 0;
      const used = sold[productId] ?? 0;
      return Math.max(0, initial - used);
    },
    [initialById, sold],
  );

  const consume = useCallback((entries: { id: string; quantity: number }[]) => {
    setSold((prev) => {
      const next = { ...prev };
      for (const { id, quantity } of entries) {
        if (!id || quantity <= 0) continue;
        next[id] = (next[id] ?? 0) + quantity;
      }
      return next;
    });
  }, []);

  return (
    <StockContext.Provider value={{ getAvailable, consume }}>
      {children}
    </StockContext.Provider>
  );
};
