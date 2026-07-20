import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Product } from "@/data/products";
import { getCategoryBySlug } from "@/data/categories";
import { useCart } from "@/contexts/CartContext";
import { useStock } from "@/contexts/StockContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const category = slug ? getCategoryBySlug(slug) : undefined;
  const { addItem, items: cartItems } = useCart();
  const { registerStock } = useStock();
  const { toast } = useToast();
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    if (!category) return;
    let cancelled = false;

    const load = async () => {
      const { data: rows, error } = await supabase
        .from("products")
        .select("id, name, unit, client_price, stock_quantity, media_urls, delivery_mode, shipping_days, category, farmer_id")
        .ilike("category", category.name)
        .eq("active", true)
        .gt("stock_quantity", 0);
      if (error || !rows || rows.length === 0) {
        if (!cancelled) setItems([]);
        return;
      }

      // Farmer name/address come from the public-safe view (no auth required),
      // fetched separately to avoid ambiguous Supabase foreign-key embedding
      // (products.farmer_id points at farmer_details, farmer_public AND
      // public_farmer_profiles at once).
      const farmerIds = [...new Set(rows.map((r) => r.farmer_id))];
      const { data: farmers } = await supabase
        .from("public_farmer_profiles")
        .select("id, company_name, address")
        .in("id", farmerIds);
      const farmerById = new Map((farmers ?? []).map((f) => [f.id, f]));

      const mapped = await Promise.all(
        rows.map(async (r) => {
          const farmer = farmerById.get(r.farmer_id);
          // Product photos live in a private bucket, so a signed URL is
          // needed. Anonymous visitors can't read it (bucket policy only
          // allows "authenticated"), so we fall back to the category image.
          let image = category.image;
          const path = r.media_urls?.[0];
          if (path) {
            const { data: signed } = await supabase.storage
              .from("product-media")
              .createSignedUrl(path, 60 * 60);
            if (signed?.signedUrl) image = signed.signedUrl;
          }
          const product: Product = {
            id: r.id,
            name: r.name,
            farmerId: r.farmer_id,
            farmer: farmer?.company_name ?? "Agricultor",
            price: r.client_price,
            unit: r.unit,
            category: r.category ?? category.name,
            image,
            rating: 0,
            reviews: 0,
            location: farmer?.address ?? "",
            region: "",
            deliveryMode: r.delivery_mode,
            shippingDays: r.shipping_days ?? undefined,
            stock: r.stock_quantity ?? 0,
          };
          return product;
        })
      );
      if (!cancelled) {
        setItems(mapped);
        registerStock(mapped.map((p) => ({ id: p.id, quantity: p.stock })));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [category, registerStock]);

  if (!category) return <Navigate to="/catalogo" replace />;

  return (
    <main className="py-12">
      <div className="container">
        <Link
          to="/catalogo"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
        </Link>

        <div className="mb-8 overflow-hidden rounded-xl border border-border">
          <div className="relative h-40 sm:h-56">
            <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <h1 className="absolute bottom-4 left-5 font-display text-3xl font-bold text-white md:text-4xl">
              {category.name}
            </h1>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            Ainda não há produtos nesta categoria.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((p) => {
              const available = p.stock;
              const inCart = cartItems.find((i) => i.id === p.id)?.quantity ?? 0;
              const canAdd = inCart < available;
              return (
                <div
                  key={p.id}
                  className="group overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{p.farmer}</p>
                    <Link
                      to={`/agricultor/${p.farmerId}`}
                      className="hover:underline"
                      title="Stock definido pelo agricultor"
                    >
                      <span
                        className={`mt-1 inline-block text-xs font-medium ${available <= 5 ? "text-destructive" : "text-primary"}`}
                      >
                        {available} em stock
                      </span>
                    </Link>
                    <p className="mt-2 text-xs font-medium text-primary">
                      {p.deliveryMode === "shipping"
                        ? `Entrega em casa (${p.shippingDays ?? "?"} dias)`
                        : p.deliveryMode === "both"
                        ? `Levantamento ou entrega em casa (${p.shippingDays ?? "?"} dias)`
                        : "Apenas levantamento na propriedade"}
                    </p>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <span className="text-lg font-bold text-primary">{p.price.toFixed(2)}€</span>
                        <span className="text-xs text-muted-foreground">/{p.unit}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={!canAdd}
                        onClick={() => {
                          addItem(p);
                          toast({ title: "Adicionado ao carrinho", description: p.name });
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {canAdd ? "Adicionar" : "Sem stock"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default CategoryPage;
