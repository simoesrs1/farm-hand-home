import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/i18n";
import Terms from "@/pages/Terms";

const renderTerms = () =>
  render(
    <MemoryRouter>
      <Terms />
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
});
