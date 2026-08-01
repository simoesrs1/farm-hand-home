import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Settings as SettingsIcon, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/auth-errors";

const Settings = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Senha demasiado curta", description: "Mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      toast({ title: "Senha alterada", description: "A sua nova senha está ativa." });
    } catch (err) {
      toast({ title: "Erro", description: toUserMessage(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="container max-w-2xl py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Definições</h1>
          <p className="text-sm text-muted-foreground">Gerir a conta e segurança</p>
        </div>
      </div>

      <form onSubmit={handlePasswordChange} className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-foreground">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="font-display text-base font-semibold">Alterar senha</h2>
        </div>
        <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          A sua conta de agricultor e a sua conta de cliente partilham o mesmo email e a mesma
          palavra-passe. Alterar aqui a palavra-passe altera o acesso aos dois perfis.
        </p>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Nova senha</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button type="submit" disabled={saving || !newPassword}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Atualizar senha
        </Button>
      </form>

      <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
        <div className="mb-3 flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          <h2 className="font-display text-base font-semibold">Terminar sessão</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">Sai da conta neste dispositivo.</p>
        <Button variant="destructive" onClick={async () => { await signOut(); navigate("/"); }}>
          Terminar sessão
        </Button>
      </div>
    </main>
  );
};

export default Settings;
