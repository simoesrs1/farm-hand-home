// Maps backend error messages to safe, user-friendly strings (no idioma atual).
// Avoids leaking schema/constraint details from raw database errors.
import i18n from "@/i18n";

/**
 * Deteta o erro de email duplicado no registo.
 *
 * Só é devolvido pelo GoTrue quando a confirmação de email está DESLIGADA. Com
 * a confirmação ligada o servidor não devolve erro nenhum — ver
 * `isExistingUserResponse`.
 */
export function isEmailTakenError(error: unknown): boolean {
  const m = ((error as { message?: string })?.message ?? "").toLowerCase();
  return (
    m.includes("user already registered") ||
    m.includes("already been registered") ||
    m.includes("email address is already")
  );
}

/**
 * Deteta um email já registado a partir da resposta (sem erro) do `signUp`.
 *
 * Com a confirmação de email ligada, o GoTrue consulta o `auth.users` e, se o
 * email já existir, responde com sucesso e um utilizador "fantasma" — sem
 * sessão e com a lista de identidades vazia — para não revelar diretamente que
 * a conta existe. Esse array vazio é o sinal fiável de duplicado.
 *
 * A verificação é estrita de propósito: se o campo `identities` vier ausente ou
 * nulo (versões antigas do GoTrue), assumimos registo normal em vez de acusar
 * um duplicado que pode não existir.
 */
export function isExistingUserResponse(
  user: { identities?: unknown[] | null } | null | undefined,
): boolean {
  return !!user && Array.isArray(user.identities) && user.identities.length === 0;
}

export function toUserMessage(error: unknown): string {
  const msg = (error as { message?: string })?.message ?? "";
  const m = msg.toLowerCase();

  if (m.includes("user already registered") || m.includes("already exists")) {
    return i18n.t("common:errors.emailTaken");
  }
  if (m.includes("invalid login credentials")) {
    return i18n.t("common:errors.invalidLogin");
  }
  if (m.includes("email not confirmed")) {
    return i18n.t("common:errors.emailNotConfirmed");
  }
  if (m.includes("password") && (m.includes("short") || m.includes("weak") || m.includes("pwned") || m.includes("hibp"))) {
    return i18n.t("common:errors.weakPassword");
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return i18n.t("common:errors.rateLimit");
  }
  if (m.includes("row-level security") || m.includes("permission denied")) {
    return i18n.t("common:errors.forbidden");
  }
  if (m.includes("farmer_details_exploration_number_unique")) {
    return i18n.t("common:errors.explorationTaken");
  }
  if (m.includes("farmer_details_company_nif_unique")) {
    return i18n.t("common:errors.nifTaken");
  }
  if (m.includes("network") || m.includes("fetch")) {
    return i18n.t("common:errors.network");
  }
  return i18n.t("common:errors.generic");
}
