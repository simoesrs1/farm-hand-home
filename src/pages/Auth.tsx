import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Leaf, User, Tractor } from "lucide-react";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isSignup, setIsSignup] = useState(searchParams.get("tab") === "signup");
  const [profileType, setProfileType] = useState<"cliente" | "vendedor">("cliente");

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

          {/* Login / Signup toggle */}
          <div className="mb-6 flex rounded-lg bg-muted p-1">
            <button
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                !isSignup ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
              onClick={() => setIsSignup(false)}
            >
              Entrar
            </button>
            <button
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                isSignup ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
              onClick={() => setIsSignup(true)}
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

          <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            {isSignup && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome completo</label>
                <input
                  type="text"
                  placeholder="O seu nome"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                placeholder="email@exemplo.com"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Palavra-passe</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button type="submit" className="mt-2 w-full">
              {isSignup ? "Criar conta" : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
};

export default Auth;
