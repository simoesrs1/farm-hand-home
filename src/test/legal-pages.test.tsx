import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/i18n";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import { ConsentProvider } from "@/contexts/ConsentContext";

const renderTerms = () =>
  render(
    <MemoryRouter>
      <Terms />
    </MemoryRouter>,
  );

const renderPrivacy = () =>
  render(
    <MemoryRouter>
      <ConsentProvider>
        <Privacy />
      </ConsentProvider>
    </MemoryRouter>,
  );

describe("páginas legais", () => {
  afterEach(async () => {
    await i18n.changeLanguage("pt");
  });

  it("em português mostra o original, sem aviso de tradução", () => {
    renderTerms();
    expect(screen.getByRole("heading", { level: 1, name: "Termos e Condições" })).toBeInTheDocument();
    expect(screen.queryByText(/prevalece a versão portuguesa/)).not.toBeInTheDocument();
  });

  it.each([
    ["en", "Terms and Conditions", /Portuguese version prevails/],
    ["de", "Allgemeine Geschäftsbedingungen", /portugiesische Fassung/],
    ["es", "Términos y condiciones", /prevalece la versión portuguesa/],
    ["fr", "Conditions générales", /version portugaise prévaut/],
  ])("em %s mostra a tradução com o aviso de cortesia", async (lang, title, notice) => {
    await i18n.changeLanguage(lang);
    renderTerms();
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText(notice)).toBeInTheDocument();
    // As âncoras são as mesmas em todos os idiomas (ex.: /termos#ordenacao).
    expect(document.getElementById("ordenacao")).not.toBeNull();
  });

  it.each(["pt", "en", "de", "es", "fr"])(
    "a Política de Privacidade em %s tem a secção de IA e a tabela de cookies",
    async (lang) => {
      await i18n.changeLanguage(lang);
      renderPrivacy();
      // Âncoras iguais em todos os idiomas (ex.: /privacidade#ia).
      for (const id of ["dados", "automaticos", "partilha", "ia", "conservacao", "cookies"]) {
        expect(document.getElementById(id)).not.toBeNull();
      }
      expect(screen.getAllByText(/Anthropic/).length).toBeGreaterThan(0);
      expect(screen.getByText("valorrural:animacoes-pausadas")).toBeInTheDocument();
    },
  );
});
