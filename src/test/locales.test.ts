import { describe, expect, it } from "vitest";
import { NAMESPACES, resources } from "@/i18n";

type Tree = { [key: string]: string | Tree };

const flatKeys = (tree: Tree | undefined, prefix = ""): string[] =>
  Object.entries(tree ?? {}).flatMap(([k, v]) => (typeof v === "string" ? [prefix + k] : flatKeys(v, `${prefix}${k}.`)));

const flatValues = (tree: Tree | undefined): string[] =>
  Object.values(tree ?? {}).flatMap((v) => (typeof v === "string" ? [v] : flatValues(v)));

/** Variáveis de interpolação ({{nome}}) de um texto. */
const vars = (text: string) => [...text.matchAll(/\{\{\s*(\w+)/g)].map((m) => m[1]).sort();

describe("traduções", () => {
  const languages = Object.keys(resources).sort();

  it("tem os cinco idiomas", () => {
    expect(languages).toEqual(["de", "en", "es", "fr", "pt"]);
  });

  it("todos os idiomas têm as mesmas secções", () => {
    for (const lang of languages) {
      expect(Object.keys(resources[lang]).sort(), lang).toEqual([...NAMESPACES].sort());
    }
  });

  for (const ns of NAMESPACES) {
    const tree = (lang: string) => resources[lang]?.[ns] as Tree | undefined;

    it(`todos os idiomas têm as mesmas chaves em "${ns}"`, () => {
      const base = flatKeys(tree("pt")).sort();
      for (const lang of languages) {
        expect(flatKeys(tree(lang)).sort(), `${lang}/${ns}`).toEqual(base);
      }
    });

    it(`nenhum texto está vazio em "${ns}"`, () => {
      for (const lang of languages) {
        expect(flatValues(tree(lang)).some((v) => !v.trim()), `${lang}/${ns}`).toBe(false);
      }
    });

    it(`as variáveis ({{…}}) são as mesmas em "${ns}"`, () => {
      const base = new Map(flatKeys(tree("pt")).map((k) => [k, k]));
      for (const lang of languages) {
        for (const key of base.keys()) {
          const get = (l: string) => key.split(".").reduce<unknown>((t, k) => (t as Tree)?.[k], tree(l)) as string;
          expect(vars(get(lang) ?? ""), `${lang}/${ns}/${key}`).toEqual(vars(get("pt") ?? ""));
        }
      }
    });
  }
});
