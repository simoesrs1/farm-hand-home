// Envio de email, ainda sem fornecedor escolhido.
//
// Enquanto EMAIL_PROVIDER não estiver definido, sendEmail() só regista em log
// e devolve false — os lembretes continuam a chegar como notificações na app.
// Para ligar um fornecedor (ex.: Resend), basta implementar o ramo
// correspondente aqui e definir EMAIL_PROVIDER, EMAIL_API_KEY e EMAIL_FROM.

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export const emailEnabled = (): boolean => !!Deno.env.get("EMAIL_PROVIDER");

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const provider = Deno.env.get("EMAIL_PROVIDER");
  if (!provider) {
    console.log(`email desativado — não enviado: "${message.subject}"`);
    return false;
  }

  switch (provider) {
    // case "resend": { ... fetch("https://api.resend.com/emails", ...) }
    default:
      console.warn(`EMAIL_PROVIDER desconhecido: ${provider}`);
      return false;
  }
}
