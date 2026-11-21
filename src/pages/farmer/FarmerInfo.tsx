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
import FarmerOfferingsSection from "@/components/FarmerOfferingsSection";
import PageHeader from "@/components/PageHeader";
import { Trans, useTranslation } from "react-i18next";
import { formatDate } from "@/lib/format";
import { certificateLabel } from "@/lib/certificates";

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

type FieldKey = "exploration_id" | "exploration_number" | "company_name" | "company_nif" | "cae_code" | "phone" | "address" | "website" | "pickup_address";
// Nomes das secções e dos campos em farmer:info.sections.<id> e farmer:info.fields.<campo>.
type FieldDef = { key: FieldKey; type?: string; full?: boolean };

const SECTIONS: { id: "identification" | "company" | "pickup"; icon: typeof MapPin; fields: FieldDef[] }[] = [
  {
    id: "identification",
    icon: MapPin,
    fields: [{ key: "exploration_id" }, { key: "exploration_number" }],
  },
  {
    id: "company",
    icon: Building2,
    fields: [
      { key: "company_name" },
      { key: "company_nif" },
      { key: "cae_code" },
      { key: "phone", type: "tel" },
      { key: "address", full: true },
      { key: "website", type: "url", full: true },
    ],
  },
  {
    id: "pickup",
    icon: MapPin,
    fields: [{ key: "pickup_address", full: true }],
  },
];

const EDITABLE_FIELDS: FieldDef[] = SECTIONS.flatMap((s) => s.fields);

const FarmerInfo = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation(["farmer", "common", "account", "cart"]);

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
  // Agricultor novo à espera da primeira verificação (não é um pedido de alteração).
  const awaitingFirstReview = details?.verification_status === "unverified";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !details) return;
    if (!justification.trim() || justification.trim().length < 20) {
      toast({ title: t("info.errJustification"), description: t("info.errJustificationText"), variant: "destructive" });
      return;
    }
    if (files.length === 0) {
      toast({ title: t("info.errDocs"), description: t("info.errDocsText"), variant: "destructive" });
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
        toast({ title: t("info.noChanges"), description: t("info.noChangesText"), variant: "destructive" });
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
        title: t("info.submitted"),
        description: t("info.submittedText"),
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
      toast({ title: t("account:auth.error"), description: toUserMessage(err), variant: "destructive" });
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
        <p className="text-muted-foreground">{t("info.noData")}</p>
      </main>
    );
  }

  return (
    <main className="container max-w-3xl py-10">
      <PageHeader
        className="mb-6"
        eyebrow={t("area")}
        title={t("common:menu.account.farmInfo")}
        description={t("info.description")}
      />

      {/* Status banner */}
      {awaitingFirstReview ? (
        <Alert className="mb-6 border-warning/40 bg-warning/10">
          <Lock className="h-4 w-4 text-warning" />
          <AlertTitle>{t("info.unverified")}</AlertTitle>
          <AlertDescription>
            <Trans t={t} i18nKey="info.unverifiedText" components={{ b: <strong /> }} />
          </AlertDescription>
        </Alert>
      ) : isLocked ? (
        <Alert variant="destructive" className="mb-6">
          <Lock className="h-4 w-4" />
          <AlertTitle>{t("info.locked")}</AlertTitle>
          <AlertDescription>
            <Trans t={t} i18nKey="info.lockedText" components={{ b: <strong /> }} />
            {pending?.review_deadline && (
              <span className="mt-1 block text-xs">
                {t("info.deadline", { date: formatDate(pending.review_deadline) })}
              </span>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="mb-6 border-primary/30 bg-primary/5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <AlertTitle>{t("info.verified")}</AlertTitle>
          <AlertDescription>
            {t("info.verifiedText")}
          </AlertDescription>
        </Alert>
      )}

      {!editing && details.id && <FarmerOfferingsSection farmerId={details.id} />}

      {/* Current data — mirrors the onboarding sections */}
      {!editing && (
        <div className="space-y-5">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <section key={section.id} className="rounded-2xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-2 text-foreground">
                  <Icon className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-base font-semibold">{t(`info.sections.${section.id}`)}</h2>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {section.fields.map((f) => (
                    <div key={f.key as string} className={f.full ? "sm:col-span-2" : ""}>
                      <dt className="text-xs font-medium text-muted-foreground">{t(`info.fields.${f.key}`)}</dt>
                      <dd className="text-sm text-foreground break-words">{(details as any)[f.key] || "—"}</dd>
                    </div>
                  ))}
                  {section.id === "company" && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium text-muted-foreground">{t("info.farmDescription")}</dt>
                      <dd className="whitespace-pre-wrap text-sm text-foreground">{details.description || "—"}</dd>
                    </div>
                  )}
                  {section.id === "pickup" && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium text-muted-foreground">{t("info.coordinates")}</dt>
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
              <h2 className="font-display text-base font-semibold">{t("info.certificates")}</h2>
            </div>
            {certificates.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("info.noCertificates")}</p>
            ) : (
              <ul className="space-y-2">
                {certificates.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background/50 p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{certificateLabel(c.certificate_type)}</p>
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
              {t("info.requestChange")}
            </Button>
            {isLocked && (
              <p className="mt-2 text-xs text-muted-foreground">
                {awaitingFirstReview ? t("info.unverifiedHint") : t("info.pendingRequest")}
              </p>
            )}
          </div>
        </div>
      )}


      {/* Edit form with acknowledgment gate */}
      {editing && (
        <section className="space-y-6">
          {!acknowledged ? (
            <Alert className="border-warning/40 bg-warning/10 [&>svg]:text-warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("info.beforeContinue")}</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  <Trans t={t} i18nKey="info.warnIntro" components={{ b: <strong /> }} />
                </p>
                <ul className="list-disc pl-5 text-sm">
                  {(["warn1", "warn2", "warn3", "warn4"] as const).map((k) => (
                    <li key={k}>
                      <Trans t={t} i18nKey={`info.${k}`} components={{ b: <strong /> }} />
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => setAcknowledged(true)} className="gap-2">
                    <ShieldAlert className="h-4 w-4" /> {t("cart:safety.confirm")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                    {t("common:actions.cancel")}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold text-foreground">{t("info.changeRequest")}</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {EDITABLE_FIELDS.map((f) => (
                  <div key={f.key as string}>
                    <Label className="text-xs">{t(`info.fields.${f.key}`)}</Label>
                    <Input
                      type={f.type ?? "text"}
                      value={(draft as any)[f.key] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              <div>
                <Label className="text-xs">{t("productForm.description")}</Label>
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">{t("info.justification")}</Label>
                <Textarea
                  rows={4}
                  required
                  minLength={20}
                  placeholder={t("info.justificationPlaceholder")}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">{t("info.documents")}</Label>
                <Input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("info.documentsHint")}
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
                  {t("info.submit")}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setEditing(false); setAcknowledged(false); }}>
                  {t("common:actions.cancel")}
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
