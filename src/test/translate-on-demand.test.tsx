import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import i18n from "@/i18n";
import ContentTranslationBar from "@/components/ContentTranslationBar";
import TranslatedText from "@/components/TranslatedText";
import { ContentTranslationProvider } from "@/contexts/ContentTranslationContext";

const invoke = vi.hoisted(() => vi.fn(async () => ({ data: { translations: {} }, error: null })));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));

const ID = "00000000-0000-4000-8000-000000000001";

const renderPage = (translate?: boolean, type: "product" | "chat" | "notification" = "product") =>
  render(
    <ContentTranslationProvider>
      <ContentTranslationBar />
      <TranslatedText type={type} id={ID} field="description" text="Doce e sumarenta" translate={translate} />
    </ContentTranslationProvider>,
  );

// Os pedidos juntam-se durante 40 ms antes de saírem.
const waitForBatch = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 80)));

describe("tradução a pedido", () => {
  beforeEach(async () => {
    // O ambiente de testes pode não ter localStorage.
    globalThis.localStorage?.clear?.();
    invoke.mockClear();
    await i18n.changeLanguage("de");
  });

  afterEach(async () => {
    cleanup();
    await i18n.changeLanguage("pt");
  });

  it("não pede tradução sem clique", async () => {
    renderPage();
    await waitForBatch();
    expect(invoke).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Übersetzen" })).toBeTruthy();
  });

  it("pede a tradução depois do clique no botão da página", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Übersetzen" }));
    await waitForBatch();
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("em português não há botão nem pedido", async () => {
    await i18n.changeLanguage("pt");
    renderPage();
    await waitForBatch();
    expect(screen.queryByRole("button")).toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("o chat só traduz com o botão da conversa, também em português", async () => {
    await i18n.changeLanguage("pt");
    const view = renderPage(false, "chat");
    await waitForBatch();
    expect(invoke).not.toHaveBeenCalled();
    view.unmount();
    renderPage(true, "chat");
    await waitForBatch();
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("as notificações continuam automáticas", async () => {
    await i18n.changeLanguage("en");
    renderPage(undefined, "notification");
    await waitForBatch();
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
