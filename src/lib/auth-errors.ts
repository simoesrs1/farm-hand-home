// Maps backend error messages to safe, user-friendly Portuguese strings.
// Avoids leaking schema/constraint details from raw database errors.
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
  if (m.includes("network") || m.includes("fetch")) {
    return "Erro de ligação. Verifica a tua internet e tenta novamente.";
  }
  return "Ocorreu um erro. Tenta novamente.";
}
