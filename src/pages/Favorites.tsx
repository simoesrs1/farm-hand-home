import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { farmers } from "@/data/farmers";
import FarmerCard from "@/components/FarmerCard";
import PageHeader from "@/components/PageHeader";

const Favorites = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("favorites")
      .select("farmer_slug")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setSlugs((data ?? []).map((r) => r.farmer_slug));
        setLoading(false);
      });
  }, [user]);

  const favoriteFarmers = farmers.filter((f) => slugs.includes(f.id));

  if (authLoading || loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="container py-10">
      <PageHeader
        eyebrow="A minha conta"
        title="Os meus favoritos"
        description="Receba notificações sobre renovação de disponibilidade e novos produtos."
      />

      {favoriteFarmers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <Heart className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">Ainda não tem agricultores favoritos.</p>
          <Link to="/catalogo" className="text-primary underline">
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favoriteFarmers.map((f) => (
            <FarmerCard key={f.id} {...f} />
          ))}
        </div>
      )}
    </main>
  );
};

export default Favorites;
