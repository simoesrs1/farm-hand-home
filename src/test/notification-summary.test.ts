import { describe, expect, it } from "vitest";
import { summarizeNotifications } from "@/lib/notification-summary";

const n = (title: string, message = "Mensagem") => ({ title, message });

describe("summarizeNotifications", () => {
  it("sem notificações não mostra balão", () => {
    expect(summarizeNotifications([])).toBeNull();
  });

  it("uma notificação mostra o título e a mensagem", () => {
    expect(summarizeNotifications([n("Encomenda aceite", "A Quinta X aceitou o teu pedido.")])).toEqual({
      title: "Encomenda aceite",
      description: "A Quinta X aceitou o teu pedido.",
    });
  });

  it("várias mostram o número e as palavras-chave", () => {
    expect(summarizeNotifications([n("Encomenda aceite"), n("Encomenda embalada")])).toEqual({
      title: "2 novas notificações",
      description: "Encomenda aceite · Encomenda embalada",
    });
  });

  it("não repete palavras-chave iguais", () => {
    const r = summarizeNotifications([n("Nova encomenda"), n("Nova encomenda"), n("Stock esgotado")]);
    expect(r).toEqual({ title: "3 novas notificações", description: "Nova encomenda · Stock esgotado" });
  });

  it("acima de 3 palavras-chave indica quantas faltam", () => {
    const r = summarizeNotifications([n("A"), n("B"), n("C"), n("D"), n("E")]);
    expect(r?.description).toBe("A · B · C e mais 2");
  });
});
