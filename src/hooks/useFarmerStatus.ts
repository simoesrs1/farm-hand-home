import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Estado do registo do agricultor com sessão iniciada:
 * - registered: dados da exploração preenchidos (registration_step = 2);
 * - verified: aprovado pela equipa (só então aparece aos clientes e vende);
 * - status: verification_status ("unverified", "verified", "pending_review").
 * Para clientes devolve `isFarmer: false`.
 */
export const farmerStatusKey = (userId: string | undefined) => ["farmer-status", userId] as const;

export const useFarmerStatus = () => {
  const { user, profile } = useAuth();
  const isFarmer = profile?.profile_type === "vendedor";
  const query = useQuery({
    queryKey: farmerStatusKey(user?.id),
    enabled: !!user && isFarmer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farmer_details")
        .select("registration_step, verification_status")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const data = query.data;
  return {
    isFarmer,
    loading: isFarmer && query.isLoading,
    registered: !!data && data.registration_step >= 2,
    verified: data?.verification_status === "verified",
    status: data?.verification_status ?? null,
  };
};

/** Páginas de gestão da área do agricultor (exigem os dados da exploração). */
const MANAGEMENT_SECTIONS = new Set([
  "a-minha-pagina",
  "experiencias",
  "alojamento",
  "encomendas",
  "scan",
  "vendas",
  "produtos",
  "disponibilidade",
  "informacoes",
]);

/** /agricultor/<secção>/… de gestão; /agricultor/:id (perfil público) não conta. */
export const isFarmerManagementPath = (pathname: string) => {
  const [, first, section] = pathname.split("/");
  return first === "agricultor" && MANAGEMENT_SECTIONS.has(section ?? "");
};
