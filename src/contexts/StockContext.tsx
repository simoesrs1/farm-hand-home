import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type StockMap = Record<string, number>;

interface StockContextType {
  /** Unidades disponíveis conhecidas para este produto (0 se ainda não carregado). */
  getAvailable: (productId: string) => number;
  /** Regista níveis de stock já obtidos noutro pedido (ex: listagem de produtos), sem nova rede. */
  registerStock: (entries: { id: string; quantity: number }[]) => void;
  /** Vai buscar o stock atual ao Supabase para produtos ainda não conhecidos. Devolve o mapa obtido. */
  refreshStock: (productIds: string[]) => Promise<StockMap>;
  /** Decremento otimista local após checkout; o stock real é decrementado no servidor. */
  consume: (entries: { id: string; quantity: number }[]) => void;
}

const StockContext = createContext<StockContextType>({
  getAvailable: () => 0,
  registerStock: () => {},
  refreshStock: async () => ({}),
  consume: () => {},
});

export const useStock = () => useContext(StockContext);

export const StockProvider = ({ children }: { children: ReactNode }) => {
  const [stock, setStock] = useState<StockMap>({});

  const getAvailable = useCallback(
    (productId: string) => Math.max(0, stock[productId] ?? 0),
    [stock],
  );

  const registerStock = useCallback((entries: { id: string; quantity: number }[]) => {
    setStock((prev) => {
      const next = { ...prev };
      for (const { id, quantity } of entries) next[id] = quantity;
      return next;
    });
  }, []);

  const refreshStock = useCallback(async (productIds: string[]) => {
    const ids = [...new Set(productIds)];
    if (ids.length === 0) return {};
    // Only active products count as available. An inactive product still has a
    // stock_quantity row, so without this filter a deactivated item would look
    // buyable in the cart and then be rejected by checkout ("Produto
    // desconhecido"). Treating it as unknown lets the cart clamp drop it.
    const { data, error } = await supabase
      .from("products")
      .select("id, stock_quantity")
      .eq("active", true)
      .in("id", ids);
    if (error || !data) return {};
    const fresh: StockMap = {};
    for (const row of data) fresh[row.id] = row.stock_quantity ?? 0;
    setStock((prev) => ({ ...prev, ...fresh }));
    return fresh;
  }, []);

  const consume = useCallback((entries: { id: string; quantity: number }[]) => {
    setStock((prev) => {
      const next = { ...prev };
      for (const { id, quantity } of entries) {
        if (!id || quantity <= 0) continue;
        next[id] = Math.max(0, (next[id] ?? 0) - quantity);
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ getAvailable, registerStock, refreshStock, consume }),
    [getAvailable, registerStock, refreshStock, consume],
  );

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
};
