/**
 * Consentimento de cookies e armazenamento local (RGPD + Lei 41/2004, art. 5.º).
 *
 * A decisão do utilizador vive num cookie de SESSÃO (`fc_consent`, sem
 * expiração): é partilhado por todos os separadores e desaparece quando o
 * navegador fecha, pelo que o consentimento é pedido de novo em cada sessão.
 *
 * Dados que a app guarda no navegador por conveniência (carrinho, horário de
 * levantamento) passam por `scopedStorage`: sem consentimento de
 * "preferências" só valem para a sessão atual (marcados com o id de sessão
 * `fc_sid`); com consentimento persistem entre sessões.
 */

export type ConsentCategory = "necessary" | "preferences" | "maps";

export type ConsentChoices = Record<ConsentCategory, boolean>;

export interface ConsentRecord {
  /** Versão da política em vigor quando o utilizador decidiu. */
  version: number;
  decidedAt: string;
  choices: ConsentChoices;
}

/** Subir este número sempre que as categorias ou finalidades mudarem. */
export const CONSENT_VERSION = 1;

const CONSENT_COOKIE = "fc_consent";
const SESSION_COOKIE = "fc_sid";

export const CONSENT_CATEGORIES: {
  id: ConsentCategory;
  title: string;
  description: string;
  required?: boolean;
}[] = [
  {
    id: "necessary",
    title: "Estritamente necessários",
    description:
      "Indispensáveis ao funcionamento do site: manter a sessão iniciada, a segurança da conta, o carrinho durante a visita e a memória desta própria escolha. Não podem ser desativados.",
    required: true,
  },
  {
    id: "preferences",
    title: "Preferências",
    description:
      "Guardam o carrinho e o horário de levantamento escolhido neste dispositivo para que os encontre na próxima visita. Sem eles, estes dados são apagados quando fechar o navegador.",
  },
  {
    id: "maps",
    title: "Mapas (Google Maps)",
    description:
      "Carregam mapas interativos da Google para ver agricultores, marcar pontos de entrega e de levantamento. A Google pode definir cookies próprios e recolher o seu endereço IP.",
  },
];

export const DEFAULT_CHOICES: ConsentChoices = {
  necessary: true,
  preferences: false,
  maps: false,
};

// ---------------------------------------------------------------------------
// Cookies
// ---------------------------------------------------------------------------

const readCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
};

/**
 * Valores de sessão: cookie sem `max-age`/`expires`, espelhado em
 * `sessionStorage` para quando o navegador recusa o cookie (pré-visualização
 * num iframe de outro domínio, cookies bloqueados) — sem isso a decisão
 * perdia-se logo e o banner voltava a aparecer.
 */
const readSessionValue = (name: string): string | null => {
  const fromCookie = readCookie(name);
  if (fromCookie !== null) return fromCookie;
  try {
    return sessionStorage.getItem(name);
  } catch {
    return null;
  }
};

const writeSessionValue = (name: string, value: string) => {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax${secure}`;
  try {
    sessionStorage.setItem(name, value);
  } catch {
    // armazenamento indisponível — fica só o cookie
  }
};

// ---------------------------------------------------------------------------
// Registo de consentimento
// ---------------------------------------------------------------------------

export const readConsent = (): ConsentRecord | null => {
  const raw = readSessionValue(CONSENT_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsentRecord;
    // Uma política nova invalida decisões antigas.
    if (parsed.version !== CONSENT_VERSION) return null;
    return {
      ...parsed,
      choices: { ...DEFAULT_CHOICES, ...parsed.choices, necessary: true },
    };
  } catch {
    return null;
  }
};

export const writeConsent = (choices: ConsentChoices): ConsentRecord => {
  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    choices: { ...choices, necessary: true },
  };
  writeSessionValue(CONSENT_COOKIE, JSON.stringify(record));
  if (!record.choices.preferences) purgePersistedItems();
  return record;
};

export const hasConsent = (category: ConsentCategory): boolean => {
  if (category === "necessary") return true;
  return readConsent()?.choices[category] ?? false;
};

// ---------------------------------------------------------------------------
// Armazenamento condicionado ao consentimento
// ---------------------------------------------------------------------------

const sessionId = (): string => {
  let sid = readSessionValue(SESSION_COOKIE);
  if (!sid) {
    sid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    writeSessionValue(SESSION_COOKIE, sid);
  }
  return sid;
};

interface ScopedEntry<T> {
  sid: string;
  value: T;
}

const isScopedEntry = <T,>(v: unknown): v is ScopedEntry<T> =>
  !!v && typeof v === "object" && !Array.isArray(v) && "sid" in v && "value" in v;

/** Chaves geridas por `scopedStorage`. */
export const STORAGE_KEYS = {
  cart: "farmconnect_cart",
  pickupSlot: "farmconnect_pickup_slot",
} as const;

type ScopedKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Dados de uma sessão anterior ficam "em espera" enquanto o utilizador ainda
 * não decidiu nesta sessão: se aceitar as preferências são recuperados
 * (`restore`), se recusar são apagados.
 */
const pendingKey = (key: ScopedKey) => `${key}::prev`;

const readEntry = <T,>(storageKey: string): ScopedEntry<T> | null => {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = raw;
  }
  // Valor gravado antes deste mecanismo: tratá-lo como sendo desta sessão.
  return isScopedEntry<T>(parsed) ? parsed : { sid: sessionId(), value: parsed as T };
};

export const scopedStorage = {
  get<T>(key: ScopedKey): T | null {
    try {
      const entry = readEntry<T>(key);
      if (!entry) return null;
      if (entry.sid === sessionId()) return entry.value;
      if (hasConsent("preferences")) {
        scopedStorage.set(key, entry.value);
        return entry.value;
      }
      if (readConsent() === null) localStorage.setItem(pendingKey(key), JSON.stringify(entry));
      localStorage.removeItem(key);
      return null;
    } catch {
      return null;
    }
  },
  /** Recupera o valor de uma sessão anterior, se as preferências o permitirem. */
  restore<T>(key: ScopedKey): T | null {
    try {
      if (!hasConsent("preferences")) return null;
      const entry = readEntry<T>(pendingKey(key));
      if (!entry) return null;
      localStorage.removeItem(pendingKey(key));
      return entry.value;
    } catch {
      return null;
    }
  },
  set<T>(key: ScopedKey, value: T) {
    try {
      const entry: ScopedEntry<T> = { sid: sessionId(), value };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // armazenamento indisponível (modo privado, quota) — ignorar
    }
  },
};

/**
 * Quando as preferências são recusadas, os dados de sessões anteriores deixam
 * de poder ser usados; os da sessão atual mantêm-se até o navegador fechar.
 */
const purgePersistedItems = () => {
  const sid = sessionId();
  for (const key of Object.values(STORAGE_KEYS)) {
    try {
      localStorage.removeItem(pendingKey(key));
      if (readEntry(key)?.sid !== sid) localStorage.removeItem(key);
    } catch {
      // ignorar
    }
  }
};
