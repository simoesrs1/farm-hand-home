import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Leaf, User, Tractor, Loader2, AlertCircle } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  isEmailTakenError,
  isExistingUserResponse,
  toUserMessage,
} from "@/lib/auth-errors";

import {Icon} from 'react-icons-kit';
import {eyeOff} from 'react-icons-kit/feather/eyeOff';
import {eye} from 'react-icons-kit/feather/eye'

/**
 * O tipo de perfil escolhido no registo não pode viajar no fluxo OAuth (o
 * provider é que cria o utilizador). Fica guardado enquanto o browser sai para
 * a Google e é reclamado no regresso, via claim_initial_profile_type.
 */
const PENDING_PROFILE_TYPE_KEY = "farmconnect:pending_profile_type";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, refreshProfile } = useAuth();
  const [isSignup, setIsSignup] = useState(searchParams.get("tab") === "signup");
  const [profileType, setProfileType] = useState<"cliente" | "vendedor">("cliente");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Email já registado, detetado depois da tentativa de registo.
  const [emailTaken, setEmailTaken] = useState(false);

  const nextParam = searchParams.get("next");
  const safeNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;
  const redirectAfterAuth = safeNext ?? "/";

  const [type, setType] = useState('password');
  const [icon, setIcon] = useState(eyeOff);

  const userId = user?.id ?? null;

  /** Agricultores com o registo por completar entram sempre pelo onboarding. */
  const resolvePostLoginRoute = useCallback(
    async (id: string) => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("profile_type")
        .eq("id", id)
        .maybeSingle();

      if (prof?.profile_type !== "vendedor") return redirectAfterAuth;

      const { data: details } = await supabase
        .from("farmer_details")
        .select("registration_step")
        .eq("user_id", id)
        .maybeSingle();

      return !details || details.registration_step < 2
        ? "/onboarding/agricultor"
        : redirectAfterAuth;
    },
    [redirectAfterAuth],
  );

  // Sessão ativa: login por password, sessão anterior, ou regresso do OAuth
  // (o detectSessionInUrl do cliente Supabase já trocou o código por sessão).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const pending = sessionStorage.getItem(PENDING_PROFILE_TYPE_KEY);
      if (pending === "cliente" || pending === "vendedor") {
        sessionStorage.removeItem(PENDING_PROFILE_TYPE_KEY);
        // Não tem efeito se o perfil já tiver tipo definido (login, não registo).
        const { error } = await supabase.rpc("claim_initial_profile_type", {
          _profile_type: pending,
        });
        if (error) console.error("claim_initial_profile_type", error);
        else await refreshProfile();
      }

      const target = await resolvePostLoginRoute(userId);
      if (!cancelled) navigate(target, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, navigate, refreshProfile, resolvePostLoginRoute]);

  if (userId) return null;

  const handlePasswordToggle = () => {
   if (type==='password'){
      setIcon(eye);
      setType('text')
   } else {
      setIcon(eyeOff)
      setType('password')
   }
  }

  const switchToLogin = () => {
    setIsSignup(false);
    setEmailTaken(false);
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEmailTaken(false);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, profile_type: profileType },
            emailRedirectTo: window.location.origin + redirectAfterAuth,
          },
        });
        if (error) throw error;

        // O servidor já consultou o auth.users durante o signUp. Com a
        // confirmação de email ativa não devolve erro para emails duplicados —
        // sinaliza-os com um utilizador sem identidades.
        if (isExistingUserResponse(data.user)) {
          setEmailTaken(true);
          toast({
            title: "Email já registado",
            description:
              "Já existe uma conta com este email. Inicie sessão ou, se ainda não confirmou o registo, verifique a sua caixa de correio.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Conta criada!",
          description: "Verifica o teu email para confirmar o registo.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // O encaminhamento (incluindo o onboarding do agricultor) fica a cargo
        // do efeito que reage à sessão ativa.
      }
    } catch (error: unknown) {
      console.error("Auth error", error);
      // Caminho alternativo: com a confirmação de email desligada, o duplicado
      // chega como erro em vez de resposta ofuscada.
      if (isSignup && isEmailTakenError(error)) {
        setEmailTaken(true);
      }
      toast({
        title: "Erro",
        description: toUserMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setEmailTaken(false);

    try {
      // Só no registo é que há tipo de perfil a reclamar no regresso.
      if (isSignup) sessionStorage.setItem(PENDING_PROFILE_TYPE_KEY, profileType);
      else sessionStorage.removeItem(PENDING_PROFILE_TYPE_KEY);

      const redirectTo = new URL("/auth", window.location.origin);
      if (safeNext) redirectTo.searchParams.set("next", safeNext);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo.toString() },
      });
      if (error) throw error;
      // Em caso de sucesso o browser sai para a Google — o loading fica ativo.
    } catch (error: unknown) {
      console.error("Google auth error", error);
      sessionStorage.removeItem(PENDING_PROFILE_TYPE_KEY);
      toast({
        title: "Erro",
        description: toUserMessage(error),
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const busy = loading || googleLoading;

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      <div className="mx-auto w-full max-w-md px-4">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">FarmConnect</span>
          </div>

          <div className="mb-6 flex rounded-lg bg-muted p-1">
            <button
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                !isSignup ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
              onClick={() => {
                setIsSignup(false);
                setEmailTaken(false);
              }}
            >
              Entrar
            </button>
            <button
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                isSignup ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
              onClick={() => {
                setIsSignup(true);
                setEmailTaken(false);
              }}
            >
              Registar
            </button>
          </div>

          {isSignup && (
            <div className="mb-6">
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                Tipo de perfil
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-sm font-medium transition-all ${
                    profileType === "cliente"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                  onClick={() => setProfileType("cliente")}
                >
                  <User className="h-5 w-5" />
                  Cliente
                </button>
                <button
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-sm font-medium transition-all ${
                    profileType === "vendedor"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                  onClick={() => setProfileType("vendedor")}
                >
                  <Tractor className="h-5 w-5" />
                  Agricultor
                </button>
              </div>
            </div>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {isSignup && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome completo</label>
                <input
                  type="text"
                  placeholder="O seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailTaken(false);
                }}
                required
                aria-invalid={emailTaken}
                className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                  emailTaken
                    ? "border-destructive focus:ring-destructive/40"
                    : "border-input focus:ring-ring"
                }`}
              />
              {emailTaken && (
                <div className="mt-1 flex items-start gap-1 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    Este email já está registado.{" "}
                    <button
                      type="button"
                      onClick={switchToLogin}
                      className="font-medium underline underline-offset-2"
                    >
                      Entrar com este email
                    </button>
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Palavra-passe</label>
              <div className="relative">
                <input
                  type={type}
                  name="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={handlePasswordToggle}
                  className="absolute inset-y-0 right-3 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="Mostrar ou ocultar palavra-passe"
                >
                  <Icon icon={icon} size={20} />
                </button>
              </div>
            </div>

            {isSignup && profileType === "vendedor" && (
              <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                Após confirmar o email, será redirecionado para completar o perfil da sua exploração com dados da empresa e certificados.
              </p>
            )}

            <Button type="submit" className="mt-2 w-full" disabled={busy}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignup ? "Criar conta" : "Entrar"}
            </Button>

            {isSignup && (
              <p className="text-center text-xs text-muted-foreground">
                Ao criar conta, aceita os{" "}
                <Link to="/termos" className="font-medium text-primary hover:underline">
                  Termos e Condições
                </Link>{" "}
                e confirma que leu a{" "}
                <Link to="/privacidade" className="font-medium text-primary hover:underline">
                  Política de Privacidade
                </Link>
                .
              </p>
            )}
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleAuth}
            disabled={busy}
          >
            {googleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="mr-2 h-4 w-4" />
            )}
            {isSignup ? "Registar com a Google" : "Entrar com a Google"}
          </Button>

          {isSignup && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              A conta Google fica associada ao perfil de{" "}
              <span className="font-medium text-foreground">
                {profileType === "vendedor" ? "agricultor" : "cliente"}
              </span>{" "}
              selecionado acima.
            </p>
          )}
        </div>
      </div>
    </main>
  );
};

export default Auth;
