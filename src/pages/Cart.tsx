import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft, CreditCard, AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Cart = () => {
  const { items, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paying, setPaying] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  // Group items by farmer for clearer display
  const grouped = useMemo(() => {
    const map = new Map<string, { farmer: string; farmerId: string; items: typeof items }>();
    for (const item of items) {
      const key = item.farmerId;
      if (!map.has(key)) {
        map.set(key, { farmer: item.farmer, farmerId: item.farmerId, items: [] });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
  }, [items]);

  const onCheckoutClick = () => {
    if (!user) {
      toast({ title: "Inicie sessão", description: "Precisa de estar autenticado para finalizar a compra." });
      navigate("/auth");
      return;
    }
    if (profile?.profile_type === "vendedor") {
      toast({ title: "Conta de agricultor", description: "Apenas clientes podem comprar.", variant: "destructive" });
      return;
    }
    setSafetyOpen(true);
  };

  const handleCheckout = async () => {
    setSafetyOpen(false);
    setPaying(true);
    try {
      const payload = {
        items: items.map((i) => ({
          product_id: i.id,
          quantity: i.quantity,
        })),
      };
      const { data, error } = await supabase.functions.invoke("create-order", { body: payload });
      if (error || (data as any)?.error) {
        const msg = (data as any)?.error ?? error?.message ?? "Erro ao processar pagamento";
        toast({ title: "Não foi possível pagar", description: msg, variant: "destructive" });
        return;
      }
      clearCart();
      toast({ title: "Pagamento simulado com sucesso!", description: "A tua encomenda está pronta para levantar." });
      navigate("/encomendas");
    } finally {
      setPaying(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="py-16">
        <div className="container max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            O seu carrinho está vazio
          </h1>
          <p className="mt-2 text-muted-foreground">
            Explore o catálogo e adicione produtos frescos dos nossos agricultores.
          </p>
          <Link to="/catalogo" className="mt-6 inline-block">
            <Button>Ver catálogo</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="py-8">
      <div className="container max-w-5xl">
        <Link
          to="/catalogo"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Continuar a comprar
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <ShoppingCart className="h-7 w-7 text-primary" />
          <h1 className="font-display text-3xl font-bold text-foreground">
            O seu carrinho
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Items grouped by farmer */}
          <div className="space-y-6">
            {grouped.map((group) => (
              <div
                key={group.farmerId}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="border-b border-border bg-muted/30 px-5 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Produtor
                  </p>
                  <Link
                    to={`/agricultor/${group.farmerId}`}
                    className="font-display font-semibold text-foreground hover:text-primary"
                  >
                    {group.farmer}
                  </Link>
                </div>
                <ul className="divide-y divide-border">
                  {group.items.map((item) => (
                    <li key={item.id} className="flex gap-4 p-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-20 w-20 shrink-0 rounded-lg object-cover"
                      />
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {item.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {item.price.toFixed(2)}€ / {item.unit}
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-end justify-between">
                          <div className="flex items-center gap-1 rounded-lg border border-border">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-2 text-muted-foreground hover:text-foreground"
                              aria-label="Diminuir"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[2rem] text-center text-sm font-medium text-foreground">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-2 text-muted-foreground hover:text-foreground"
                              aria-label="Aumentar"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="font-bold text-primary">
                            {(item.price * item.quantity).toFixed(2)}€
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <button
              onClick={clearCart}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Esvaziar carrinho
            </button>
          </div>

          {/* Summary */}
          <aside className="h-fit rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Resumo
            </h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{totalPrice.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Levantamento</span>
                <span>Na quinta com QR</span>
              </div>
            </div>
            <div className="mt-4 flex justify-between border-t border-border pt-4">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-display text-xl font-bold text-primary">
                {totalPrice.toFixed(2)}€
              </span>
            </div>
            <div className="mt-4 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>
                Se não levantar a encomenda no prazo indicado, <strong>perderá 100% do valor pago</strong>.
              </p>
            </div>
            <Button onClick={onCheckoutClick} disabled={paying} className="mt-6 w-full gap-2" size="lg">
              <CreditCard className="h-4 w-4" />
              {paying ? "A processar…" : "Pagar (simulado)"}
            </Button>
          </aside>
        </div>
      </div>

      <AlertDialog open={safetyOpen} onOpenChange={setSafetyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Aviso de segurança
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Para a sua segurança, <strong>não entre de forma alguma</strong> em propriedades
                  com falta de identificação, sinalética visível do produtor, ou que possam colocar
                  a sua segurança em causa.
                </p>
                <p>
                  Confirme sempre o local de levantamento indicado pelo agricultor antes de se
                  deslocar e prefira deslocações em horário diurno.
                </p>
                <p className="text-xs text-muted-foreground">
                  A FarmConnect <strong>não se responsabiliza por atos de terceiros</strong> nem
                  pela segurança física das pessoas durante o processo de levantamento.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCheckout}>
              Compreendo e quero continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </div>
      </div>
    </main>
  );
};

export default Cart;
