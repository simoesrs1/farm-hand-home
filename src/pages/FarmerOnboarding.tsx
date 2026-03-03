import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Leaf, Upload, X, Loader2, Award, Building2, FileText } from "lucide-react";

const FarmerOnboarding = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState("");
  const [caeCode, setCaeCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [certificates, setCertificates] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [farmerDetailsId, setFarmerDetailsId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (!authLoading && profile?.profile_type !== "vendedor") {
      navigate("/");
      return;
    }
    if (user) {
      checkOnboardingStatus();
    }
  }, [user, profile, authLoading]);

  const checkOnboardingStatus = async () => {
    const { data } = await supabase
      .from("farmer_details")
      .select("id, registration_step, company_name")
      .eq("user_id", user!.id)
      .single();

    if (data) {
      setFarmerDetailsId(data.id);
      if (data.registration_step === 2) {
        navigate("/");
      }
    }
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setCertificates((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setCertificates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerDetailsId || !user) return;
    setLoading(true);

    try {
      // Upload certificates
      const certRecords: { file_name: string; file_url: string }[] = [];
      for (const file of certificates) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("certificates")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("certificates")
          .getPublicUrl(filePath);

        certRecords.push({ file_name: file.name, file_url: urlData.publicUrl });
      }

      // Update farmer details
      const { error: updateError } = await supabase
        .from("farmer_details")
        .update({
          company_name: companyName,
          cae_code: caeCode,
          address,
          phone,
          website,
          description,
          registration_step: 2,
          initial_score: Math.min(certificates.length * 10, 50),
        })
        .eq("id", farmerDetailsId);

      if (updateError) throw updateError;

      // Insert certificate records
      if (certRecords.length > 0) {
        const { error: certError } = await supabase
          .from("farmer_certificates")
          .insert(certRecords.map((cert) => ({ ...cert, farmer_id: farmerDetailsId })));
        if (certError) throw certError;
      }

      toast({
        title: "Perfil completo!",
        description: "O seu perfil de agricultor foi criado com sucesso.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="py-12">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Leaf className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Complete o seu perfil
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Passo 2 de 2 — Preencha os dados da sua exploração agrícola
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">✓</div>
          <div className="h-0.5 flex-1 bg-primary" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company info */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2 text-foreground">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Dados da Empresa</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome da empresa *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder="Ex: Quinta do Vale Verde"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">CAE da empresa *</label>
                <input
                  type="text"
                  value={caeCode}
                  onChange={(e) => setCaeCode(e.target.value)}
                  required
                  placeholder="Ex: 01110"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Morada</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Morada da exploração"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Telefone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+351 912 345 678"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Descrição da exploração</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Fale sobre a sua exploração, métodos de produção, história..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Certificates */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-2 flex items-center gap-2 text-foreground">
              <Award className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Certificados</h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Carregue certificados de produção biológica, qualidade, ou outros. Quantos mais certificados, melhor a sua pontuação inicial.
            </p>

            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-muted/50">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Clique para adicionar certificados
              </span>
              <span className="text-xs text-muted-foreground">PDF, JPG, PNG (máx. 10MB)</span>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileAdd}
                className="hidden"
              />
            </label>

            {certificates.length > 0 && (
              <div className="mt-4 space-y-2">
                {certificates.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="flex-1 truncate text-sm text-foreground">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 rounded-lg bg-primary/5 p-3">
                  <Award className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    Pontuação estimada: +{Math.min(certificates.length * 10, 50)} pontos
                  </span>
                </div>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Completar registo
          </Button>
        </form>
      </div>
    </main>
  );
};

export default FarmerOnboarding;
