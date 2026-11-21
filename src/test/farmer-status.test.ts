import { describe, expect, it } from "vitest";
import { isFarmerManagementPath } from "@/hooks/useFarmerStatus";

describe("área de venda do agricultor", () => {
  it("as páginas de gestão exigem os dados da exploração", () => {
    for (const path of [
      "/agricultor/produtos",
      "/agricultor/produtos/novo",
      "/agricultor/produtos/123/editar",
      "/agricultor/experiencias/nova",
      "/agricultor/alojamento",
      "/agricultor/encomendas",
      "/agricultor/vendas",
      "/agricultor/disponibilidade",
      "/agricultor/informacoes",
      "/agricultor/a-minha-pagina",
      "/agricultor/scan",
    ]) {
      expect(isFarmerManagementPath(path)).toBe(true);
    }
  });

  it("o resto do site fica livre, incluindo o perfil público do agricultor", () => {
    for (const path of ["/", "/catalogo", "/carrinho", "/agricultor/7f3c2a", "/onboarding/agricultor", "/auth"]) {
      expect(isFarmerManagementPath(path)).toBe(false);
    }
  });
});
