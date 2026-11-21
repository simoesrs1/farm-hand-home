import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import DeleteAccountSection from "@/components/DeleteAccountSection";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/auth-errors";
import { useTranslation } from "react-i18next";

const Settings = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation(["account", "common"]);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: t("settings.tooShort"), description: t("settings.minChars"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      toast({ title: t("settings.changed"), description: t("settings.changedText") });
    } catch (err) {
      toast({ title: t("auth.error"), description: toUserMessage(err), variant: "destructive" });
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
      <PageHeader eyebrow={t("myAccount")} title={t("settings.title")} description={t("settings.description")} />

      <form onSubmit={handlePasswordChange} className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-foreground">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="font-display text-base font-semibold">{t("settings.changePassword")}</h2>
        </div>
        <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          {t("settings.sharedPassword")}
        </p>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("settings.newPassword")}</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            placeholder={t("settings.minChars")}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button type="submit" disabled={saving || !newPassword}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("settings.update")}
        </Button>
      </form>

      <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
        <div className="mb-3 flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          <h2 className="font-display text-base font-semibold">{t("settings.logout")}</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{t("settings.logoutText")}</p>
        <Button variant="destructive" onClick={async () => { await signOut(); navigate("/"); }}>
          {t("settings.logout")}
        </Button>
      </div>

      <DeleteAccountSection />
    </main>
  );
};

export default Settings;
