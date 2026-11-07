// Envio de email através do Resend (https://resend.com).
//
// Segredos (supabase secrets set ...):
//   EMAIL_PROVIDER  "resend" para ativar; sem ele, sendEmail() só regista em log
//                   e devolve false (as notificações na app chegam na mesma).
//   EMAIL_API_KEY   chave da API do Resend (re_...).
//   EMAIL_FROM      remetente. Enquanto o domínio valorrural.pt não estiver
//                   verificado no Resend: "ValorRural <onboarding@resend.dev>"
//                   (só entrega no email da própria conta Resend). Depois de
//                   verificado: "ValorRural <noreply@valorrural.pt>".
//   EMAIL_REPLY_TO  opcional; endereço para onde vão as respostas.

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "ValorRural <noreply@valorrural.pt>";

export const emailEnabled = (): boolean => !!Deno.env.get("EMAIL_PROVIDER");

// Escapa texto antes de o pôr no HTML de um email (conteúdo ou atributos).
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendWithResend(message: EmailMessage): Promise<boolean> {
  const apiKey = Deno.env.get("EMAIL_API_KEY");
  if (!apiKey) {
    console.error("email: EMAIL_API_KEY não configurada");
    return false;
  }

  const replyTo = Deno.env.get("EMAIL_REPLY_TO");
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: Deno.env.get("EMAIL_FROM") || DEFAULT_FROM,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    // Não registar o destinatário completo nos logs.
    console.error(`email: Resend respondeu ${res.status}: ${await res.text()}`);
    return false;
  }
  return true;
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const provider = Deno.env.get("EMAIL_PROVIDER");
  if (!provider) {
    console.log(`email desativado — não enviado: "${message.subject}"`);
    return false;
  }

  try {
    switch (provider) {
      case "resend":
        return await sendWithResend(message);
      default:
        console.warn(`EMAIL_PROVIDER desconhecido: ${provider}`);
        return false;
    }
  } catch (e) {
    console.error("email: falha no envio", e);
    return false;
  }
}
