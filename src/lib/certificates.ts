/**
 * Tipos de certificado do agricultor. Na base de dados fica o nome português
 * (farmer_certificates.certificate_type); o nome mostrado vem das traduções.
 */
import i18n from "@/i18n";

export const CERTIFICATE_TYPES = [
  { key: "organic", value: "Produção Biológica" },
  { key: "integrated", value: "Modo de Produção Integrada" },
  { key: "pdo", value: "Denominação de Origem Protegida (DOP)" },
  { key: "pgi", value: "Indicação Geográfica Protegida (IGP)" },
  { key: "tsg", value: "Especialidade Tradicional Garantida (ETG)" },
  { key: "haccp", value: "Certificação Sanitária / HACCP" },
  { key: "animalWelfare", value: "Bem-estar Animal" },
  { key: "fairTrade", value: "Comércio Justo" },
  { key: "globalGap", value: "Global G.A.P." },
  { key: "iso", value: "ISO 9001 / 22000" },
  { key: "other", value: "Outro" },
] as const;

/** Nome do tipo de certificado no idioma atual (aceita o valor guardado). */
export const certificateLabel = (value: string) => {
  const type = CERTIFICATE_TYPES.find((c) => c.value === value);
  return type ? i18n.t(`farmer:certificates.${type.key}`) : value;
};
