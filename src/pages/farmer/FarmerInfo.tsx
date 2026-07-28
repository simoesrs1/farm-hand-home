/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, ShieldAlert, Lock, FileUp, AlertTriangle, Save, MapPin, Building2, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/auth-errors";

type FarmerDetails = {
  id: string;
  exploration_id: string | null;
  exploration_number: string | null;
  company_name: string | null;
  company_nif: string | null;
  cae_code: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  verification_status: string;
};

type Certificate = {
  id: string;
  file_name: string;
  certificate_type: string;
};

type FieldDef = { key: keyof FarmerDetails; label: string; type?: string; full?: boolean };

const SECTIONS: { title: string; icon: typeof MapPin; fields: FieldDef[] }[] = [
  {
    title: "Identificação da Exploração",
    icon: MapPin,
    fields: [
      { key: "exploration_id", label: "Identificação da exploração" },
      { key: "exploration_number", label: "Nº de exploração" },
    ],
  },
  {
    title: "Dados da Empresa",
    icon: Building2,
    fields: [
      { key: "company_name", label: "Nome da empresa" },
      { key: "company_nif", label: "NIF da empresa" },
      { key: "cae_code", label: "CAE da empresa" },
      { key: "phone", label: "Telefone", type: "tel" },
      { key: "address", label: "Morada", full: true },
      { key: "website", label: "Website", type: "url", full: true },
    ],
  },
  {
    title: "Local de Levantamento da Encomenda",
    icon: MapPin,
    fields: [
      { key: "pickup_address", label: "Morada de levantamento", full: true },
    ],
  },
];

const EDITABLE_FIELDS: FieldDef[] = SECTIONS.flatMap((s) => s.fields);

const FarmerInfo = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<FarmerDetails | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [pending, setPending] = useState<any | null>(null);
  const [editing, setEditing] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [draft, setDraft] = useState<Partial<FarmerDetails>>({});
  const [description, setDescription] = useState("");
  const [justification, setJustification] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || profile?.profile_type !== "vendedor")) {
      navigate("/perfil");
    }
  }, [user, profile, authLoading, navigate]);

  const SELECT_COLS = "id, company_name, company_nif, cae_code, exploration_number, exploration_id, address, phone, website, description, pickup_address, pickup_lat, pickup_lng, verification_status";

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("farmer_details")
        .select(SELECT_COLS)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setDetails(data as FarmerDetails);
        setDraft(data as any);
        setDescription(data.description ?? "");
        const [{ data: req }, { data: certs }] = await Promise.all([
          supabase
            .from("farmer_change_requests")
            .select("*")
            .eq("farmer_id", data.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("farmer_certificates")
            .select("id, file_name, certificate_type")
            .eq("farmer_id", data.id),
        ]);
        setPending(req);
        setCertificates((certs ?? []) as Certificate[]);
      }
      setLoading(false);
    })();
  }, [user]);

  const isLocked = details?.verification_status !== "verified";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !details) return;
    if (!justification.trim() || justification.trim().length < 20) {
      toast({ title: "Justificação insuficiente", description: "Descreva o motivo das alterações (mínimo 20 caracteres).", variant: "destructive" });
      return;
    }
    if (files.length === 0) {
      toast({ title: "Documentação obrigatória", description: "Anexe pelo menos um documento comprovativo.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Compute changed fields
      const changes: Record<string, { from: any; to: any }> = {};
      for (const f of EDITABLE_FIELDS) {
        const next = (draft as any)[f.key] ?? null;
        const prev = (details as any)[f.key] ?? null;
        if ((next || "") !== (prev || "")) {
          changes[f.key] = { from: prev, to: next };
        }
      }
      if ((description || "") !== (details.description || "")) {
        changes.description = { from: details.description, to: description };
      }
      if (Object.keys(changes).length === 0) {
        toast({ title: "Sem alterações", description: "Não detetámos alterações face aos dados atuais.", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      // Upload documents
      const urls: string[] = [];
      for (const file of files) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("change-request-docs").upload(path, file);
        if (upErr) throw upErr;
        urls.push(path);
      }

      const { error } = await supabase.from("farmer_change_requests").insert({
        farmer_id: details.id,
        user_id: user.id,
        requested_changes: changes,
        justification: justification.trim(),
        document_urls: urls,
      });
      if (error) throw error;

      toast({
        title: "Pedido submetido",
        description: "A equipa FarmConnect tem até 7 dias para validar. O perfil ficará bloqueado até decisão.",
      });
      setEditing(false);
      setAcknowledged(false);
      setJustification("");
      setFiles([]);
      // refresh
      const { data: refreshed } = await supabase
        .from("farmer_details")
        .select(SELECT_COLS)
        .eq("user_id", user.id)
        .maybeSingle();
      if (refreshed) setDetails(refreshed as FarmerDetails);
      const { data: req } = await supabase
        .from("farmer_change_requests")
        .select("*")
        .eq("farmer_id", details.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setPending(req);
    } catch (err) {
      toast({ title: "Erro", description: toUserMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!details) {
    return (
      <main className="container max-w-2xl py-10">
        <p className="text-muted-foreground">Sem dados de agricultor.</p>
      </main>
    );
  }

  return (
    <main className="container max-w-3xl py-10">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Informações da exploração</h1>
          <p className="text-sm text-muted-foreground">Dados submetidos no registo inicial</p>
        </div>
      </header>

      {/* Status banner */}
      {isLocked ? (
        <Alert variant="destructive" className="mb-6">
          <Lock className="h-4 w-4" />
          <AlertTitle>Perfil bloqueado — em verificação</AlertTitle>
          <AlertDescription>
            Existe um pedido de alteração pendente. Enquanto a equipa FarmConnect não validar a informação,
            o perfil e os produtos <strong>não aparecem publicamente</strong> e <strong>não pode realizar vendas</strong>.
            A nossa equipa tem até <strong>7 dias</strong> para concluir a análise.
            {pending?.review_deadline && (
              <span className="mt-1 block text-xs">
                Prazo máximo: {new Date(pending.review_deadline).toLocaleDateString("pt-PT")}
              </span>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="mb-6 border-primary/30 bg-primary/5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <AlertTitle>Perfil verificado</AlertTitle>
          <AlertDescription>
            O seu perfil está ativo. Qualquer alteração de dados terá de ser revista pela equipa FarmConnect.
          </AlertDescription>
        </Alert>
      )}

      {/* Current data — mirrors the onboarding sections */}
      {!editing && (
        <div className="space-y-5">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <section key={section.title} className="rounded-2xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-2 text-foreground">
                  <Icon className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-base font-semibold">{section.title}</h2>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {section.fields.map((f) => (
                    <div key={f.key as string} className={f.full ? "sm:col-span-2" : ""}>
                      <dt className="text-xs font-medium text-muted-foreground">{f.label}</dt>
                      <dd className="text-sm text-foreground break-words">{(details as any)[f.key] || "—"}</dd>
                    </div>
                  ))}
                  {section.title === "Dados da Empresa" && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium text-muted-foreground">Descrição da exploração</dt>
                      <dd className="whitespace-pre-wrap text-sm text-foreground">{details.description || "—"}</dd>
                    </div>
                  )}
                  {section.title === "Local de Levantamento da Encomenda" && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium text-muted-foreground">Coordenadas no mapa</dt>
                      <dd className="text-sm text-foreground">
                        {details.pickup_lat != null && details.pickup_lng != null
                          ? `${details.pickup_lat.toFixed(5)}, ${details.pickup_lng.toFixed(5)}`
                          : "—"}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            );
          })}

          {/* Certificates */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2 text-foreground">
              <Award className="h-5 w-5 text-primary" />
              <h2 className="font-display text-base font-semibold">Certificados</h2>
            </div>
            {certificates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum certificado submetido.</p>
            ) : (
              <ul className="space-y-2">
                {certificates.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background/50 p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.certificate_type}</p>
                      <p className="text-xs text-muted-foreground">{c.file_name}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="pt-1">
            <Button onClick={() => setEditing(true)} disabled={isLocked} className="gap-2">
              <FileUp className="h-4 w-4" />
              Pedir alteração de dados
            </Button>
            {isLocked && (
              <p className="mt-2 text-xs text-muted-foreground">
                Já existe um pedido em análise. Aguarde a decisão da equipa para submeter novo pedido.
              </p>
            )}
          </div>
        </div>
      )}


      {/* Edit form with acknowledgment gate */}
      {editing && (
        <section className="space-y-6">
          {!acknowledged ? (
            <Alert variant="destructive" className="border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Antes de continuar</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  Ao submeter um pedido de alteração, o seu perfil será <strong>imediatamente bloqueado</strong> até a
                  equipa FarmConnect validar a nova informação.
                </p>
                <ul className="list-disc pl-5 text-sm">
                  <li>Enquanto não for validado, o perfil e os produtos <strong>não aparecem</strong> na plataforma.</li>
                  <li>Durante esse período <strong>não poderá realizar vendas</strong>.</li>
                  <li>A equipa tem um prazo máximo de <strong>7 dias</strong> para analisar o pedido.</li>
                  <li>É obrigatório anexar <strong>documentação comprovativa</strong> e uma justificação clara.</li>
                </ul>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => setAcknowledged(true)} className="gap-2">
                    <ShieldAlert className="h-4 w-4" /> Compreendo e quero continuar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                    Cancelar
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold text-foreground">Pedido de alteração</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {EDITABLE_FIELDS.map((f) => (
                  <div key={f.key as string}>
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      type={f.type ?? "text"}
                      value={(draft as any)[f.key] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Justificação das alterações *</Label>
                <Textarea
                  rows={4}
                  required
                  minLength={20}
                  placeholder="Explique o motivo das alterações (mínimo 20 caracteres)…"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Documentação comprovativa *</Label>
                <Input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Anexe certidões, comprovativos ou outros documentos que sustentem o pedido.
                </p>
                {files.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                    {files.map((f) => <li key={f.name}>{f.name}</li>)}
                  </ul>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting} className="gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Submeter pedido
                </Button>
                <Button type="button" variant="outline" onClick={() => { setEditing(false); setAcknowledged(false); }}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </section>
      )}
    </main>
  );
};

export default FarmerInfo;
