import { afterEach, describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { translateServerMessage } from "@/lib/server-messages";

describe("mensagens do servidor", () => {
  afterEach(async () => {
    await i18n.changeLanguage("pt");
  });

  it("em português ficam iguais", () => {
    expect(translateServerMessage("Carrinho vazio")).toBe("Carrinho vazio");
  });

  it("traduz mensagens fixas", async () => {
    await i18n.changeLanguage("en");
    expect(translateServerMessage("Carrinho vazio")).toBe("Empty cart");
  });

  it("traduz mensagens com partes variáveis", async () => {
    await i18n.changeLanguage("en");
    expect(translateServerMessage("Stock insuficiente para Tomate cherry")).toBe("Insufficient stock for Tomate cherry");
    expect(translateServerMessage("O número de pessoas tem de estar entre 2 e 8.")).toBe(
      "The number of people must be between 2 and 8.",
    );
  });

  it("deixa como estão as mensagens desconhecidas", async () => {
    await i18n.changeLanguage("de");
    expect(translateServerMessage("Algo inesperado")).toBe("Algo inesperado");
  });
});
