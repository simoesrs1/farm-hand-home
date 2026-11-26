import { describe, expect, it } from "vitest";
import "@/i18n";
import { amountLabel, unitSuffix } from "@/lib/format";

describe("quantidade com unidade", () => {
  it("põe × quando a unidade é o tamanho da embalagem", () => {
    expect(amountLabel(120, "1 Kg")).toBe("120 × 1 Kg");
    expect(amountLabel(40, "500 g")).toBe("40 × 500 g");
    expect(unitSuffix("750 mL")).toBe("× 750 mL");
  });

  it("mantém as unidades sem número", () => {
    expect(amountLabel(120, "Kg")).toBe("120 Kg");
    expect(unitSuffix("L")).toBe("L");
  });

  it("não acrescenta nada quando não há unidade", () => {
    expect(amountLabel(3, null)).toBe("3");
    expect(amountLabel(0, "")).toBe("0");
  });

  it("não põe × nas reservas", () => {
    expect(amountLabel(2, "noite")).not.toContain("×");
  });
});
