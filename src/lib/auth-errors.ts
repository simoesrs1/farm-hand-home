// Maps backend error messages to safe, user-friendly Portuguese strings.
// Avoids leaking schema/constraint details from raw database errors.

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
    return "Este email já está registado.";
  }
  if (m.includes("invalid login credentials")) {
    return "Email ou palavra-passe incorretos.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirma o teu email antes de entrar.";
  }
  if (m.includes("password") && (m.includes("short") || m.includes("weak") || m.includes("pwned") || m.includes("hibp"))) {
    return "Palavra-passe demasiado fraca ou comprometida. Escolhe outra.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Demasiadas tentativas. Tenta novamente daqui a alguns minutos.";
  }
  if (m.includes("row-level security") || m.includes("permission denied")) {
    return "Não tens permissão para esta ação.";
  }
  if (m.includes("farmer_details_exploration_number_unique")) {
    return "Este número de exploração já está associado a outra conta.";
  }
  if (m.includes("farmer_details_company_nif_unique")) {
    return "Este NIF já está associado a outra conta.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Erro de ligação. Verifica a tua internet e tenta novamente.";
  }
  return "Ocorreu um erro. Tenta novamente.";
}
