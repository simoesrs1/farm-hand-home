/**
 * Validação dos dados oficiais do agricultor (onboarding — passo 2).
 *
 * Cada validador devolve a mensagem de erro a mostrar ao utilizador, ou `null`
 * quando o valor é válido. As verificações de unicidade (NIF / nº de
 * exploração) são feitas no servidor, via RPC, e não fazem parte deste módulo.
 */

export interface FarmerFormValues {
  explorationId: string;
  explorationNumber: string;
  companyName: string;
  companyNif: string;
  caeCode: string;
  phone: string;
  address: string;
  website: string;
  description: string;
  pickupAddress: string;
  pickupLat: number | null;
  pickupLng: number | null;
}

export type FarmerField =
  | "explorationId"
  | "explorationNumber"
  | "companyName"
  | "companyNif"
  | "caeCode"
  | "phone"
  | "address"
  | "website"
  | "pickupAddress"
  | "pickupLocation";

export type FarmerFieldErrors = Partial<Record<FarmerField, string>>;

const REQUIRED = "Campo obrigatório.";

/** Prefixos válidos de NIF português (singulares, coletivos e casos especiais). */
const NIF_PREFIXES = [
  "1", "2", "3", "5", "6", "8",
  "45", "70", "71", "72", "74", "75", "77", "78", "79", "90", "91", "98", "99",
];

/** Valida um NIF português: 9 dígitos, prefixo conhecido e dígito de controlo (mód. 11). */
export const isValidPtNif = (nif: string): boolean => {
  if (!/^\d{9}$/.test(nif)) return false;
  if (!NIF_PREFIXES.some((p) => nif.startsWith(p))) return false;

  let total = 0;
  for (let i = 0; i < 8; i++) {
    total += Number(nif[i]) * (9 - i);
  }
  const remainder = total % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;

  return checkDigit === Number(nif[8]);
};

export const validateExplorationId = (value: string): string | null => {
  const v = value.trim();
  if (!v) return REQUIRED;
  if (v.length < 3) return "Deve ter pelo menos 3 caracteres.";
  return null;
};

export const validateExplorationNumber = (value: string): string | null => {
  const v = value.trim();
  if (!v) return REQUIRED;
  if (!/^[A-Za-z0-9]+$/.test(v)) return "Use apenas letras e números, sem espaços.";
  if (v.length < 7 || v.length > 20) return "Deve ter entre 7 e 20 caracteres.";
  return null;
};

export const validateCompanyName = (value: string): string | null => {
  const v = value.trim();
  if (!v) return REQUIRED;
  if (v.length < 3) return "Deve ter pelo menos 3 caracteres.";
  return null;
};

export const validateCompanyNif = (value: string): string | null => {
  const v = value.trim();
  if (!v) return REQUIRED;
  if (!/^\d+$/.test(v)) return "O NIF só pode conter dígitos.";
  if (v.length !== 9) return "O NIF tem de ter 9 dígitos.";
  if (!isValidPtNif(v)) return "NIF inválido — verifique os dígitos introduzidos.";
  return null;
};

export const validateCaeCode = (value: string): string | null => {
  const v = value.trim();
  if (!v) return REQUIRED;
  if (!/^\d{5}$/.test(v)) return "O CAE tem de ter 5 dígitos (ex: 01110).";
  return null;
};

export const validatePhone = (value: string): string | null => {
  const v = value.replace(/[\s.\-()]/g, "");
  if (!v) return REQUIRED;
  if (!/^(?:\+351|00351)?[23789]\d{8}$/.test(v)) {
    return "Telefone inválido (ex: +351 912 345 678).";
  }
  return null;
};

export const validateAddress = (value: string): string | null => {
  const v = value.trim();
  if (!v) return REQUIRED;
  if (v.length < 5) return "Indique uma morada completa.";
  return null;
};

/** Website é opcional; quando preenchido tem de ser um endereço plausível. */
export const validateWebsite = (value: string): string | null => {
  const v = value.trim();
  if (!v) return null;
  if (!/^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(v)) {
    return "Endereço inválido (ex: https://aminhaquinta.pt).";
  }
  return null;
};

export const validatePickupAddress = (value: string): string | null => {
  const v = value.trim();
  if (!v) return REQUIRED;
  if (v.length < 5) return "Indique uma morada completa.";
  return null;
};

export const validatePickupLocation = (
  lat: number | null,
  lng: number | null,
): string | null =>
  lat == null || lng == null
    ? "Marque o local de levantamento no mapa."
    : null;

/** Acrescenta o protocolo ao website quando o agricultor o omite. */
export const normalizeWebsite = (value: string): string => {
  const v = value.trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

/** Valida o formulário completo e devolve apenas os campos com erro. */
export const validateFarmerForm = (values: FarmerFormValues): FarmerFieldErrors => {
  const errors: FarmerFieldErrors = {};
  const set = (field: FarmerField, error: string | null) => {
    if (error) errors[field] = error;
  };

  set("explorationId", validateExplorationId(values.explorationId));
  set("explorationNumber", validateExplorationNumber(values.explorationNumber));
  set("companyName", validateCompanyName(values.companyName));
  set("companyNif", validateCompanyNif(values.companyNif));
  set("caeCode", validateCaeCode(values.caeCode));
  set("phone", validatePhone(values.phone));
  set("address", validateAddress(values.address));
  set("website", validateWebsite(values.website));
  set("pickupAddress", validatePickupAddress(values.pickupAddress));
  set("pickupLocation", validatePickupLocation(values.pickupLat, values.pickupLng));

  return errors;
};
