import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  ConsentCategory,
  ConsentChoices,
  ConsentRecord,
  DEFAULT_CHOICES,
  readConsent,
  writeConsent,
} from "@/lib/consent";

interface ConsentContextType {
  record: ConsentRecord | null;
  /** O utilizador já decidiu nesta sessão. */
  decided: boolean;
  choices: ConsentChoices;
  hasConsent: (category: ConsentCategory) => boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  save: (choices: ConsentChoices) => void;
  /** Ativa uma única categoria mantendo as restantes (ex.: "Ativar mapas"). */
  grant: (category: ConsentCategory) => void;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
}

const ConsentContext = createContext<ConsentContextType | null>(null);

export const useConsent = () => {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent tem de ser usado dentro de ConsentProvider");
  return ctx;
};

const CHANNEL = "farmconnect-consent";

export const ConsentProvider = ({ children }: { children: ReactNode }) => {
  const [record, setRecord] = useState<ConsentRecord | null>(() => readConsent());
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Uma decisão tomada noutro separador aplica-se a este também.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => setRecord(readConsent());
    return () => channel.close();
  }, []);

  const commit = useCallback((choices: ConsentChoices) => {
    const previous = readConsent()?.choices;
    const next = writeConsent(choices);
    setRecord(next);
    setPreferencesOpen(false);
    try {
      const channel = new BroadcastChannel(CHANNEL);
      channel.postMessage("changed");
      channel.close();
    } catch {
      // BroadcastChannel indisponível
    }
    // Scripts de terceiros já carregados (Google Maps) só saem da memória com
    // um recarregamento; fazê-lo apenas quando um consentimento é retirado.
    if (previous?.maps && !next.choices.maps) window.location.reload();
  }, []);

  const value = useMemo<ConsentContextType>(() => {
    const choices = record?.choices ?? DEFAULT_CHOICES;
    return {
      record,
      decided: record !== null,
      choices,
      hasConsent: (category) => category === "necessary" || choices[category],
      acceptAll: () => commit({ necessary: true, preferences: true, maps: true }),
      rejectAll: () => commit(DEFAULT_CHOICES),
      save: commit,
      grant: (category) => commit({ ...choices, [category]: true }),
      preferencesOpen,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
    };
  }, [record, preferencesOpen, commit]);

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
};
