import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, User as UserIcon, Save, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/auth-errors";
import { AVATAR_EXTENSIONS, AVATAR_MAX_BYTES, avatarPublicUrl, isStoredAvatar } from "@/lib/avatar";

const Profile = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  // Caminho no bucket `avatars`; null se não houver fotografia carregada.
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) setFullName(profile.full_name ?? "");
    if (user) {
      supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => setAvatarPath(isStoredAvatar(data?.avatar_url) ? data.avatar_url : null));
    }
  }, [profile, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: "Perfil atualizado", description: "As suas alterações foram guardadas." });
    } catch (err) {
      toast({ title: "Erro", description: toUserMessage(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // A fotografia grava-se logo, sem depender de "Guardar alterações".
  const saveAvatar = async (nextPath: string | null) => {
    if (!user) return false;
    const { error } = await supabase.from("profiles").update({ avatar_url: nextPath }).eq("id", user.id);
    if (error) {
      toast({ title: "Erro", description: toUserMessage(error), variant: "destructive" });
      return false;
    }
    if (avatarPath) await supabase.storage.from("avatars").remove([avatarPath]);
    setAvatarPath(nextPath);
    return true;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    const ext = AVATAR_EXTENSIONS[file.type];
    if (!ext) {
      toast({ title: "Formato não suportado", description: "Use JPG, PNG ou WebP.", variant: "destructive" });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast({ title: "Fotografia demasiado grande", description: "O limite é de 2 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (error) {
      toast({ title: "Erro", description: toUserMessage(error), variant: "destructive" });
    } else if (await saveAvatar(path)) {
      toast({ title: "Fotografia atualizada" });
    } else {
      await supabase.storage.from("avatars").remove([path]);
    }
    setUploading(false);
  };

  const handleRemovePhoto = async () => {
    setUploading(true);
    if (await saveAvatar(null)) toast({ title: "Fotografia removida" });
    setUploading(false);
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
          <UserIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">O meu perfil</h1>
          <p className="text-sm text-muted-foreground">Edite os seus dados pessoais</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
          <input
            type="email"
            value={user.email ?? ""}
            disabled
            className="w-full rounded-lg border border-input bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome completo</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Fotografia de perfil</span>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
              {avatarPath ? (
                <img src={avatarPublicUrl(avatarPath)} alt="A sua fotografia de perfil" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-6 w-6" />
              )}
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-2" asChild disabled={uploading}>
              <label className="cursor-pointer">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {avatarPath ? "Trocar fotografia" : "Carregar fotografia"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploading}
                  onChange={handleFile}
                />
              </label>
            </Button>
            {avatarPath && (
              <Button type="button" variant="ghost" size="sm" className="gap-2" disabled={uploading} onClick={handleRemovePhoto}>
                <Trash2 className="h-4 w-4" /> Remover
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            JPG, PNG ou WebP, até 2 MB. Só aparece nas suas avaliações se o autorizar em cada uma.
          </p>
        </div>
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar alterações
        </Button>
      </form>
    </main>
  );
};

export default Profile;
