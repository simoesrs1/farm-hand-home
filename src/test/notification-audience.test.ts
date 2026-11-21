import { describe, expect, it } from "vitest";
import { audienceMode, modeAudience, notificationRoute, otherAudience } from "@/lib/notification-audience";

describe("notificações por perfil", () => {
  it("perfil ativo ↔ audiência", () => {
    expect(modeAudience("cliente")).toBe("client");
    expect(modeAudience("vendedor")).toBe("farmer");
    expect(audienceMode("farmer")).toBe("vendedor");
    expect(otherAudience("client")).toBe("farmer");
  });

  it("a página aberta depende do perfil da notificação, não do ativo", () => {
    const order = { type: "new_order", link: null, order_id: "abc" };
    expect(notificationRoute({ ...order, audience: "farmer" })).toBe("/agricultor/encomendas?id=abc");
    expect(notificationRoute({ ...order, type: "delivered", audience: "client" })).toBe("/encomendas?id=abc");
    expect(notificationRoute({ type: "low_stock", link: null, order_id: null, audience: "farmer" })).toBe("/agricultor/produtos");
    expect(notificationRoute({ type: "favorite_promo", link: "/catalogo/mel", order_id: null, audience: "client" })).toBe("/catalogo/mel");
    expect(notificationRoute({ type: "x", link: null, order_id: null, audience: "client" })).toBeNull();
  });
});
