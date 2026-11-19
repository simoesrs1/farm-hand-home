import "@testing-library/jest-dom";
import i18n from "@/i18n";

// Os testes verificam os textos em português.
await i18n.changeLanguage("pt");

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
