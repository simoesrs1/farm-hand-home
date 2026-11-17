/**
 * Formatação de valores para a interface (pt-PT).
 * Usar sempre estas funções em vez de `toFixed(2) + "€"`, para os preços
 * terem o mesmo aspeto em todo o site: "2,40 €".
 */
const euroFormat = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

/** 2.4 → "2,40 €". Valores nulos ou inválidos contam como 0. */
export const formatEuro = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return euroFormat.format(Number.isFinite(n) ? n : 0);
};
