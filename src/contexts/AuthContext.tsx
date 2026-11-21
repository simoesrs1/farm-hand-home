import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tipo de perfil escolhido no registo com a Google, guardado antes de sair
 * para a Google (sessionStorage). No regresso é reclamado aqui, em qualquer
 * página onde o utilizador chegue, e não só em /auth.
 */
export const PENDING_PROFILE_TYPE_KEY = "farmconnect:pending_profile_type";

/**
 * Reclama o tipo de perfil pendente (uma só vez; sem efeito se já escolhido).
 * O perfil é lido em dois sítios ao arrancar (getSession e onAuthStateChange):
 * ambos esperam pela mesma reclamação, para nenhum ler o tipo antigo.
 */
let claimInFlight: Promise<void> | null = null;
const claimPendingProfileType = () => {
  if (claimInFlight) return claimInFlight;
  claimInFlight = (async () => {
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem(PENDING_PROFILE_TYPE_KEY);
      if (pending) sessionStorage.removeItem(PENDING_PROFILE_TYPE_KEY);
    } catch {
      return;
    }
    if (pending !== "cliente" && pending !== "vendedor") return;
    const { error } = await supabase.rpc("claim_initial_profile_type", { _profile_type: pending });
    if (error) console.error("claim_initial_profile_type", error);
  })().finally(() => {
    claimInFlight = null;
  });
  return claimInFlight;
};

type ProfileRow = {
  full_name: string | null;
  profile_type: string;
  active_mode?: string | null;
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  loading: boolean;
  /** Modo em que o utilizador está a navegar: "cliente" ou "vendedor" */
  activeMode: "cliente" | "vendedor";
  /** Verdadeiro quando a conta é de agricultor (tem também acesso ao modo cliente) */
  canSwitchProfile: boolean;
  switchMode: (mode: "cliente" | "vendedor") => Promise<void>;
  /** Relê o perfil da base de dados (ex.: depois de o tipo mudar no servidor) */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  activeMode: "cliente",
  canSwitchProfile: false,
  switchMode: async () => {},
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    // O perfil só fica disponível depois de reclamado o tipo escolhido no registo.
    await claimPendingProfileType();
    const { data } = await supabase
      .from("profiles")
      .select("full_name, profile_type, active_mode")
      .eq("id", userId)
      .single();
    setProfile(data as ProfileRow | null);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const canSwitchProfile = profile?.profile_type === "vendedor";
  const activeMode: "cliente" | "vendedor" = canSwitchProfile
    ? profile?.active_mode === "cliente"
      ? "cliente"
      : "vendedor"
    : "cliente";

  const switchMode = async (mode: "cliente" | "vendedor") => {
    if (!user || !canSwitchProfile) return;
    setProfile((p) => (p ? { ...p, active_mode: mode } : p));
    await supabase.from("profiles").update({ active_mode: mode }).eq("id", user.id);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, activeMode, canSwitchProfile, switchMode, refreshProfile, signOut }}
    >

      {children}
    </AuthContext.Provider>
  );
};
