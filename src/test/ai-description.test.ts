import { describe, expect, it } from "vitest";
import { cleanFacts, hasCopyInput, pickImageSources } from "@/lib/ai-description";

const file = (name: string, type: string) => new File(["x"], name, { type });

describe("descrições com IA", () => {
  it("envia até 3 imagens, as novas primeiro, sem vídeos", () => {
    const files = [file("a.jpg", "image/jpeg"), file("v.mp4", "video/mp4"), file("b.png", "image/png")];
    const paths = ["u/1.webp", "u/2.mov", "u/3.jpg", "u/4.jpg"];
    const r = pickImageSources(files, paths);
    expect(r.files.map((f) => f.name)).toEqual(["a.jpg", "b.png"]);
    expect(r.paths).toEqual(["u/1.webp"]);
  });

  it("só usa fotografias guardadas quando não há novas", () => {
    expect(pickImageSources([], ["u/1.jpg", "u/2.jpg", "u/3.jpg", "u/4.jpg"]).paths).toHaveLength(3);
  });

  it("retira os dados vazios", () => {
    expect(cleanFacts({ Nome: "Mel", Categoria: "", Biológico: false, Unidade: null, Pessoas: 4 })).toEqual({
      Nome: "Mel",
      Pessoas: 4,
    });
  });

  it("precisa de texto, dados ou fotografias", () => {
    expect(hasCopyInput("  ", {}, [], [])).toBe(false);
    expect(hasCopyInput("", { Título: "Apanha da uva" }, [], [])).toBe(true);
    expect(hasCopyInput("", {}, [], ["u/1.jpg"])).toBe(true);
  });
});
