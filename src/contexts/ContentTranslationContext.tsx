import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Tradução do texto escrito por agricultores e clientes: só a pedido, com um
 * botão único no topo da página (ContentTranslationBar). A escolha mantém-se
 * entre páginas e visitas. Ver docs/traducoes.md.
 */

/** Chave no armazenamento local (declarada na secção de cookies). */
export const CONTENT_TRANSLATION_STORAGE_KEY = "valorrural_translate_content";

interface ContentTranslationValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  /** Há texto desta página que se pode traduzir. */
  hasContent: boolean;
  /** Cada texto traduzível regista-se; devolve a função que o retira. */
  register: () => () => void;
}

const ContentTranslationContext = createContext<ContentTranslationValue>({
  enabled: false,
  setEnabled: () => {},
  hasContent: false,
  register: () => () => {},
});

const readStored = () => {
  try {
    return localStorage.getItem(CONTENT_TRANSLATION_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const ContentTranslationProvider = ({ children }: { children: ReactNode }) => {
  const [enabled, setEnabledState] = useState(readStored);
  const [count, setCount] = useState(0);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    try {
      if (next) localStorage.setItem(CONTENT_TRANSLATION_STORAGE_KEY, "1");
      else localStorage.removeItem(CONTENT_TRANSLATION_STORAGE_KEY);
    } catch {
      // sem armazenamento local: a escolha vale só até recarregar
    }
  }, []);

  const register = useCallback(() => {
    setCount((n) => n + 1);
    return () => setCount((n) => n - 1);
  }, []);

  const hasContent = count > 0;
  const value = useMemo(
    () => ({ enabled, setEnabled, hasContent, register }),
    [enabled, setEnabled, hasContent, register],
  );

  return <ContentTranslationContext.Provider value={value}>{children}</ContentTranslationContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useContentTranslation = () => useContext(ContentTranslationContext);
