import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Leaf,
  Upload,
  X,
  Loader2,
  Award,
  Building2,
  FileText,
  MapPin,
  Hash,
} from "lucide-react";
import { toUserMessage } from "@/lib/auth-errors";

const CERTIFICATE_TYPES = [
  "Produção Biológica",
  "Modo de Produção Integrada",
  "Denominação de Origem Protegida (DOP)",
  "Indicação Geográfica Protegida (IGP)",
  "Especialidade Tradicional Garantida (ETG)",
  "Certificação Sanitária / HACCP",
  "Bem-estar Animal",
  "Comércio Justo",
  "Global G.A.P.",
  "ISO 9001 / 22000",
  "Outro",
];

interface CertificateUpload {
  file: File;
  type: string;
}

const FarmerOnboarding = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Identificação da exploração
  const [explorationId, setExplorationId] = useState("");
  const [explorationNumber, setExplorationNumber] = useState("");

  // Empresa
  const [companyName, setCompanyName] = useState("");
  const [companyNif, setCompanyNif] = useState("");
  const [caeCode, setCaeCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");

  const [certificates, setCertificates] = useState<CertificateUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [farmerDetailsId, setFarmerDetailsId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (!authLoading && profile && profile.profile_type !== "vendedor") {
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
      .select("id, registration_step")
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
      const newFiles = Array.from(e.target.files).map((file) => ({
        file,
        type: CERTIFICATE_TYPES[0],
      }));
      setCertificates((prev) => [...prev, ...newFiles]);
    }
    e.target.value = "";
  };

  const updateCertType = (index: number, type: string) => {
    setCertificates((prev) =>
      prev.map((c, i) => (i === index ? { ...c, type } : c)),
    );
  };

  const removeFile = (index: number) => {
    setCertificates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerDetailsId || !user) return;
    setLoading(true);

    try {
      const certRecords: {
        file_name: string;
        file_url: string;
        certificate_type: string;
      }[] = [];

      for (const { file, type } of certificates) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("certificates")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("certificates")
          .getPublicUrl(filePath);

        certRecords.push({
          file_name: file.name,
          file_url: urlData.publicUrl,
          certificate_type: type,
        });
      }

      const { error: updateError } = await supabase
        .from("farmer_details")
        .update({
          exploration_id: explorationId,
          exploration_number: explorationNumber,
          company_name: companyName,
          company_nif: companyNif,
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

      if (certRecords.length > 0) {
        const { error: certError } = await supabase
          .from("farmer_certificates")
          .insert(
            certRecords.map((cert) => ({
              ...cert,
              farmer_id: farmerDetailsId,
            })),
          );
        if (certError) throw certError;
      }

      toast({
        title: "Perfil completo!",
        description: "O seu perfil de agricultor foi criado com sucesso.",
      });
      navigate("/");
    } catch (error: unknown) {
      console.error("Farmer onboarding error", error);
      toast({
        title: "Erro",
        description: toUserMessage(error),
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
    <main className="fixed inset-0 z-40 overflow-y-auto bg-background/80 backdrop-blur-sm">
      <div className="flex min-h-full items-start justify-center p-4 py-10">
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl">
          {/* Header */}
          <div className="border-b border-border p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Leaf className="h-6 w-6" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">
              Complete o seu perfil de agricultor
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Passo 2 de 2 — Preencha os dados oficiais da sua exploração
            </p>

            <div className="mx-auto mt-5 flex max-w-xs items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                ✓
              </div>
              <div className="h-0.5 flex-1 bg-primary" />
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            {/* Identificação da Exploração */}
            <section className="rounded-xl border border-border bg-background/50 p-5">
              <div className="mb-4 flex items-center gap-2 text-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="font-display text-base font-semibold">
                  Identificação da Exploração
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Identificação da exploração *
                  </label>
                  <input
                    type="text"
                    value={explorationId}
                    onChange={(e) => setExplorationId(e.target.value)}
                    required
                    placeholder="Ex: Quinta do Vale"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Nº de exploração *
                  </label>
                  <input
                    type="text"
                    value={explorationNumber}
                    onChange={(e) => setExplorationNumber(e.target.value)}
                    required
                    placeholder="Ex: PT123456789"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </section>

            {/* Empresa */}
            <section className="rounded-xl border border-border bg-background/50 p-5">
              <div className="mb-4 flex items-center gap-2 text-foreground">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="font-display text-base font-semibold">
                  Dados da Empresa
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Nome da empresa *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    placeholder="Ex: Quinta do Vale Verde, Lda."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    NIF da empresa *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={9}
                    value={companyNif}
                    onChange={(e) =>
                      setCompanyNif(e.target.value.replace(/\D/g, ""))
                    }
                    required
                    placeholder="9 dígitos"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    CAE da empresa *
                  </label>
                  <input
                    type="text"
                    value={caeCode}
                    onChange={(e) => setCaeCode(e.target.value)}
                    required
                    placeholder="Ex: 01110"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+351 912 345 678"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Morada
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Morada da exploração"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Website
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Descrição da exploração
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Fale sobre a sua exploração, métodos de produção, história..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </section>

            {/* Certificados */}
            <section className="rounded-xl border border-border bg-background/50 p-5">
              <div className="mb-2 flex items-center gap-2 text-foreground">
                <Award className="h-5 w-5 text-primary" />
                <h2 className="font-display text-base font-semibold">
                  Certificados
                </h2>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Carregue todos os certificados que possui. Selecione o tipo de
                cada documento. Quantos mais certificados, melhor a sua
                pontuação inicial atribuída pela equipa.
              </p>

              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-muted/50">
                <Upload className="h-7 w-7 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Clique para adicionar certificados
                </span>
                <span className="text-xs text-muted-foreground">
                  PDF, JPG, PNG (máx. 10MB cada)
                </span>
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
                  {certificates.map((cert, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center"
                    >
                      <div className="flex flex-1 items-center gap-2 overflow-hidden">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate text-sm text-foreground">
                          {cert.file.name}
                        </span>
                      </div>
                      <select
                        value={cert.type}
                        onChange={(e) => updateCertType(index, e.target.value)}
                        className="rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {CERTIFICATE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {(cert.file.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remover"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 rounded-lg bg-primary/5 p-3">
                    <Hash className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      Pontuação inicial estimada: +
                      {Math.min(certificates.length * 10, 50)} pontos
                    </span>
                  </div>
                </div>
              )}
            </section>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Completar registo
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
};

export default FarmerOnboarding;
