import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { farmerStatusKey } from "@/hooks/useFarmerStatus";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import OfferingsPicker from "@/components/OfferingsPicker";
import type { Offerings } from "@/lib/farmer-offerings";
import {
  Upload,
  X,
  Loader2,
  Award,
  Building2,
  FileText,
  MapPin,
  Hash,
  AlertCircle,
  Check,
  Store,
} from "lucide-react";
import { toUserMessage } from "@/lib/auth-errors";
import PickupLocationMap from "@/components/PickupLocationMap";
import {
  FarmerField,
  FarmerFormValues,
  normalizeWebsite,
  validateCompanyNif,
  validateExplorationNumber,
  validateFarmerForm,
} from "@/lib/farmer-validation";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { CERTIFICATE_TYPES } from "@/lib/certificates";

interface CertificateUpload {
  file: File;
  type: string;
}

const EMPTY_VALUES: FarmerFormValues = {
  explorationId: "",
  explorationNumber: "",
  companyName: "",
  companyNif: "",
  caeCode: "",
  phone: "",
  address: "",
  website: "",
  description: "",
  pickupAddress: "",
  pickupLat: null,
  pickupLng: null,
};

/** Milissegundos de inatividade antes de consultar o servidor por duplicados. */
const UNIQUENESS_DEBOUNCE_MS = 500;

const baseInputClass =
  "w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2";

const inputClass = (invalid?: string) =>
  `${baseInputClass} ${
    invalid
      ? "border-destructive focus:ring-destructive/40"
      : "border-input focus:ring-ring"
  }`;

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className="mt-1 flex items-start gap-1 text-xs text-destructive">
      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
      <span>{message}</span>
    </p>
  ) : null;

const FieldStatus = ({
  checking,
  available,
  label,
}: {
  checking: boolean;
  available: boolean;
  label: string;
}) => {
  const { t } = useTranslation("farmer");
  if (checking) {
    return (
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t("onboarding.checking")}
      </p>
    );
  }
  if (available) {
    return (
      <p className="mt-1 flex items-center gap-1 text-xs text-primary">
        <Check className="h-3 w-3" />
        {label}
      </p>
    );
  }
  return null;
};

const FarmerOnboarding = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(["farmer", "common", "account"]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [values, setValues] = useState<FarmerFormValues>(EMPTY_VALUES);
  const [offerings, setOfferings] = useState<Offerings>({ products: false, experiences: false, stays: false });
  const noOffering = !offerings.products && !offerings.experiences && !offerings.stays;
  const [touched, setTouched] = useState<Partial<Record<FarmerField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Unicidade verificada no servidor (RPC), fora da validação síncrona.
  const [takenErrors, setTakenErrors] = useState<
    Partial<Record<"explorationNumber" | "companyNif", string>>
  >({});
  const [checking, setChecking] = useState({
    explorationNumber: false,
    companyNif: false,
  });
  const [availability, setAvailability] = useState({
    explorationNumber: false,
    companyNif: false,
  });

  const [certificates, setCertificates] = useState<CertificateUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [farmerDetailsId, setFarmerDetailsId] = useState<string | null>(null);

  const errors = useMemo(() => validateFarmerForm(values), [values]);

  /** Só mostramos o erro depois de o campo ser tocado ou de haver tentativa de submissão. */
  const showError = (field: FarmerField): string | undefined => {
    if (field === "explorationNumber" || field === "companyNif") {
      const taken = takenErrors[field];
      if (taken) return taken;
    }
    return touched[field] || submitAttempted ? errors[field] : undefined;
  };

  const setField = <K extends keyof FarmerFormValues>(
    field: K,
    value: FarmerFormValues[K],
  ) => setValues((prev) => ({ ...prev, [field]: value }));

  const markTouched = (field: FarmerField) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

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

  // Nº de exploração: verificação de duplicados enquanto o agricultor escreve.
  //
  // farmer_details RLS only exposes each farmer's own row, so a direct select
  // can never see another farmer's exploration_number. Use a SECURITY DEFINER
  // RPC that only returns a boolean instead.
  const explorationNumber = values.explorationNumber;
  useEffect(() => {
    setTakenErrors((prev) => ({ ...prev, explorationNumber: undefined }));
    setAvailability((prev) => ({ ...prev, explorationNumber: false }));

    const value = explorationNumber.trim().toUpperCase();
    if (validateExplorationNumber(value)) return;

    let cancelled = false;
    setChecking((prev) => ({ ...prev, explorationNumber: true }));

    const timer = setTimeout(async () => {
      const { data: taken, error } = await supabase.rpc(
        "exploration_number_taken",
        { p_exploration_number: value, p_exclude_id: farmerDetailsId },
      );
      if (cancelled) return;
      setChecking((prev) => ({ ...prev, explorationNumber: false }));
      if (error) return;
      if (taken) {
        setTakenErrors((prev) => ({
          ...prev,
          explorationNumber: i18n.t("common:errors.explorationTaken"),
        }));
      } else {
        setAvailability((prev) => ({ ...prev, explorationNumber: true }));
      }
    }, UNIQUENESS_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setChecking((prev) => ({ ...prev, explorationNumber: false }));
    };
  }, [explorationNumber, farmerDetailsId]);

  // NIF da empresa: mesma verificação de duplicados.
  const companyNif = values.companyNif;
  useEffect(() => {
    setTakenErrors((prev) => ({ ...prev, companyNif: undefined }));
    setAvailability((prev) => ({ ...prev, companyNif: false }));

    if (validateCompanyNif(companyNif)) return;

    let cancelled = false;
    setChecking((prev) => ({ ...prev, companyNif: true }));

    const timer = setTimeout(async () => {
      const { data: taken, error } = await supabase.rpc("company_nif_taken", {
        p_company_nif: companyNif,
        p_exclude_id: farmerDetailsId,
      });
      if (cancelled) return;
      setChecking((prev) => ({ ...prev, companyNif: false }));
      if (error) return;
      if (taken) {
        setTakenErrors((prev) => ({
          ...prev,
          companyNif: i18n.t("common:errors.nifTaken"),
        }));
      } else {
        setAvailability((prev) => ({ ...prev, companyNif: true }));
      }
    }, UNIQUENESS_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setChecking((prev) => ({ ...prev, companyNif: false }));
    };
  }, [companyNif, farmerDetailsId]);

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        file,
        type: CERTIFICATE_TYPES[0].value,
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

    setSubmitAttempted(true);

    const blocking = { ...errors, ...takenErrors, offerings: noOffering ? "required" : undefined };
    if (Object.values(blocking).some(Boolean)) {
      toast({
        title: t("onboarding.incomplete"),
        description: t("onboarding.incompleteText"),
        variant: "destructive",
      });
      // Espera pelo repaint para que os campos já estejam marcados como inválidos.
      requestAnimationFrame(() => {
        document
          .querySelector("[data-invalid='true']")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

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

        // Store the storage path (not a public URL). Signed URLs are generated
        // on demand when a farmer requests to view their certificate.
        certRecords.push({
          file_name: file.name,
          file_url: filePath,
          certificate_type: type,
        });
      }

      // Primeiro os certificados: a pontuação inicial é calculada no servidor
      // a partir dos que já estão guardados.
      let certIds: string[] = [];
      if (certRecords.length > 0) {
        const { data: inserted, error: certError } = await supabase
          .from("farmer_certificates")
          .insert(
            certRecords.map((cert) => ({
              ...cert,
              farmer_id: farmerDetailsId,
            })),
          )
          .select("id");
        if (certError) throw certError;
        certIds = (inserted ?? []).map((c) => c.id);
      }

      // Os dados oficiais só se gravam por esta função (uma única vez); depois
      // do registo, mudam apenas por pedido de alteração.
      const { error: updateError } = await supabase.rpc("complete_farmer_onboarding", {
        p_exploration_id: values.explorationId.trim(),
        p_exploration_number: values.explorationNumber.trim().toUpperCase(),
        p_company_name: values.companyName.trim(),
        p_company_nif: values.companyNif,
        p_cae_code: values.caeCode.trim(),
        p_address: values.address.trim(),
        p_phone: values.phone.trim(),
        p_website: normalizeWebsite(values.website),
        p_description: values.description.trim(),
        p_pickup_address: values.pickupAddress.trim(),
        p_pickup_lat: values.pickupLat!,
        p_pickup_lng: values.pickupLng!,
        p_offers_products: offerings.products,
        p_offers_experiences: offerings.experiences,
        p_offers_stays: offerings.stays,
      });
      if (updateError) {
        // Sem registo concluído, os certificados voltariam a ser inseridos na
        // tentativa seguinte: apaga os desta tentativa.
        if (certIds.length > 0) await supabase.from("farmer_certificates").delete().in("id", certIds);
        throw updateError;
      }

      // O aviso e a área de venda passam a ver o registo completo.
      await queryClient.invalidateQueries({ queryKey: farmerStatusKey(user?.id) });
      toast({
        title: t("onboarding.done"),
        description: t("onboarding.doneText"),
      });
      navigate("/");
    } catch (error: unknown) {
      console.error("Farmer onboarding error", error);
      toast({
        title: t("account:auth.error"),
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

  const explorationIdError = showError("explorationId");
  const explorationNumberError = showError("explorationNumber");
  const companyNameError = showError("companyName");
  const companyNifError = showError("companyNif");
  const caeCodeError = showError("caeCode");
  const phoneError = showError("phone");
  const addressError = showError("address");
  const websiteError = showError("website");
  const pickupAddressError = showError("pickupAddress");
  const pickupLocationError = showError("pickupLocation");

  return (
    <main className="fixed inset-0 z-40 overflow-y-auto bg-background/80 backdrop-blur-sm">
      <div className="flex min-h-full items-start justify-center p-4 py-10">
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl">
          {/* Header */}
          <div className="border-b border-border p-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">{t("onboarding.step")}</p>
            <h1 className="mt-2 font-display text-2xl text-foreground">
              {t("onboarding.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("onboarding.subtitle")}
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

          {/* noValidate: as mensagens de erro são as nossas, não as do browser. */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5 p-6">
            {/* O que vai disponibilizar: uma, duas ou as três opções. */}
            <section className="rounded-xl border border-border bg-background/50 p-5" data-invalid={submitAttempted && noOffering}>
              <div className="mb-1 flex items-center gap-2 text-foreground">
                <Store className="h-5 w-5 text-primary" />
                <h2 className="font-display text-base font-semibold">{t("onboarding.offerings")}</h2>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                {t("onboarding.offeringsHint")}
              </p>
              <OfferingsPicker value={offerings} onChange={setOfferings} />
              {submitAttempted && noOffering && (
                <p className="mt-2 text-xs text-destructive">{t("offeringsSection.chooseOne")}.</p>
              )}
            </section>

            {/* Identificação da Exploração */}
            <section className="rounded-xl border border-border bg-background/50 p-5">
              <div className="mb-4 flex items-center gap-2 text-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="font-display text-base font-semibold">
                  {t("info.sections.identification")}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div data-invalid={!!explorationIdError}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("info.fields.exploration_id")} *
                  </label>
                  <input
                    type="text"
                    value={values.explorationId}
                    onChange={(e) => setField("explorationId", e.target.value)}
                    onBlur={() => markTouched("explorationId")}
                    aria-invalid={!!explorationIdError}
                    placeholder={t("onboarding.explorationIdPlaceholder")}
                    className={inputClass(explorationIdError)}
                  />
                  <FieldError message={explorationIdError} />
                </div>
                <div data-invalid={!!explorationNumberError}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("info.fields.exploration_number")} *
                  </label>
                  <input
                    type="text"
                    value={values.explorationNumber}
                    onChange={(e) =>
                      setField("explorationNumber", e.target.value.toUpperCase())
                    }
                    onBlur={() => markTouched("explorationNumber")}
                    aria-invalid={!!explorationNumberError}
                    maxLength={20}
                    placeholder={t("onboarding.explorationNumberPlaceholder")}
                    className={inputClass(explorationNumberError)}
                  />
                  <FieldError message={explorationNumberError} />
                  {!explorationNumberError && (
                    <FieldStatus
                      checking={checking.explorationNumber}
                      available={availability.explorationNumber}
                      label={t("onboarding.numberAvailable")}
                    />
                  )}
                </div>
              </div>
            </section>

            {/* Empresa */}
            <section className="rounded-xl border border-border bg-background/50 p-5">
              <div className="mb-4 flex items-center gap-2 text-foreground">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="font-display text-base font-semibold">
                  {t("info.sections.company")}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div data-invalid={!!companyNameError}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("info.fields.company_name")} *
                  </label>
                  <input
                    type="text"
                    value={values.companyName}
                    onChange={(e) => setField("companyName", e.target.value)}
                    onBlur={() => markTouched("companyName")}
                    aria-invalid={!!companyNameError}
                    placeholder={t("onboarding.companyPlaceholder")}
                    className={inputClass(companyNameError)}
                  />
                  <FieldError message={companyNameError} />
                </div>
                <div data-invalid={!!companyNifError}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("info.fields.company_nif")} *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={9}
                    value={values.companyNif}
                    onChange={(e) =>
                      setField("companyNif", e.target.value.replace(/\D/g, ""))
                    }
                    onBlur={() => markTouched("companyNif")}
                    aria-invalid={!!companyNifError}
                    placeholder={t("onboarding.nifPlaceholder")}
                    className={inputClass(companyNifError)}
                  />
                  <FieldError message={companyNifError} />
                  {!companyNifError && (
                    <FieldStatus
                      checking={checking.companyNif}
                      available={availability.companyNif}
                      label={t("onboarding.nifAvailable")}
                    />
                  )}
                </div>
                <div data-invalid={!!caeCodeError}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("info.fields.cae_code")} *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={values.caeCode}
                    onChange={(e) =>
                      setField("caeCode", e.target.value.replace(/\D/g, ""))
                    }
                    onBlur={() => markTouched("caeCode")}
                    aria-invalid={!!caeCodeError}
                    placeholder={t("onboarding.caePlaceholder")}
                    className={inputClass(caeCodeError)}
                  />
                  <FieldError message={caeCodeError} />
                </div>
                <div data-invalid={!!phoneError}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("info.fields.phone")} *
                  </label>
                  <input
                    type="tel"
                    value={values.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    onBlur={() => markTouched("phone")}
                    aria-invalid={!!phoneError}
                    placeholder="+351 912 345 678"
                    className={inputClass(phoneError)}
                  />
                  <FieldError message={phoneError} />
                </div>
                <div className="sm:col-span-2" data-invalid={!!addressError}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("info.fields.address")} *
                  </label>
                  <input
                    type="text"
                    value={values.address}
                    onChange={(e) => setField("address", e.target.value)}
                    onBlur={() => markTouched("address")}
                    aria-invalid={!!addressError}
                    placeholder={t("onboarding.addressPlaceholder")}
                    className={inputClass(addressError)}
                  />
                  <FieldError message={addressError} />
                </div>
                <div className="sm:col-span-2" data-invalid={!!websiteError}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("info.fields.website")}
                  </label>
                  <input
                    type="text"
                    value={values.website}
                    onChange={(e) => setField("website", e.target.value)}
                    onBlur={() => markTouched("website")}
                    aria-invalid={!!websiteError}
                    placeholder="https://..."
                    className={inputClass(websiteError)}
                  />
                  <FieldError message={websiteError} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("info.farmDescription")}
                  </label>
                  <textarea
                    value={values.description}
                    onChange={(e) => setField("description", e.target.value)}
                    rows={3}
                    placeholder={t("onboarding.descriptionPlaceholder")}
                    className={inputClass()}
                  />
                </div>
              </div>
            </section>

            {/* Local de Levantamento */}
            <section className="rounded-xl border border-border bg-background/50 p-5">
              <div className="mb-2 flex items-center gap-2 text-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="font-display text-base font-semibold">
                  {t("info.sections.pickup")}
                </h2>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                {t("onboarding.pickupHint")}
              </p>

              <div className="space-y-3">
                <div data-invalid={!!pickupAddressError}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("info.fields.pickup_address")} *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={values.pickupAddress}
                      onChange={(e) => setField("pickupAddress", e.target.value)}
                      onBlur={() => markTouched("pickupAddress")}
                      aria-invalid={!!pickupAddressError}
                      placeholder={t("onboarding.pickupPlaceholder")}
                      className={inputClass(pickupAddressError)}
                    />
                    {values.address && (
                      <button
                        type="button"
                        onClick={() => {
                          setField("pickupAddress", values.address);
                          markTouched("pickupAddress");
                        }}
                        className="shrink-0 rounded-lg border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
                      >
                        {t("onboarding.useFarmAddress")}
                      </button>
                    )}
                  </div>
                  <FieldError message={pickupAddressError} />
                </div>

                <div data-invalid={!!pickupLocationError}>
                  <PickupLocationMap
                    lat={values.pickupLat}
                    lng={values.pickupLng}
                    invalid={!!pickupLocationError}
                    onChange={(la, ln) => {
                      setValues((prev) => ({
                        ...prev,
                        pickupLat: la,
                        pickupLng: ln,
                      }));
                      markTouched("pickupLocation");
                    }}
                  />

                  {values.pickupLat != null && values.pickupLng != null ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("onboarding.coordinates", { coords: `${values.pickupLat.toFixed(5)}, ${values.pickupLng.toFixed(5)}` })}
                    </p>
                  ) : pickupLocationError ? (
                    <FieldError message={pickupLocationError} />
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("onboarding.clickMap")}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Certificados */}
            <section className="rounded-xl border border-border bg-background/50 p-5">
              <div className="mb-2 flex items-center gap-2 text-foreground">
                <Award className="h-5 w-5 text-primary" />
                <h2 className="font-display text-base font-semibold">
                  {t("info.certificates")}
                </h2>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                {t("onboarding.certificatesHint")}
              </p>

              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-muted/50">
                <Upload className="h-7 w-7 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {t("onboarding.addCertificates")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("onboarding.fileTypes")}
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
                        {CERTIFICATE_TYPES.map((c) => (
                          <option key={c.key} value={c.value}>
                            {t(`certificates.${c.key}`)}
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
                          aria-label={t("common:actions.remove")}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 rounded-lg bg-primary/5 p-3">
                    <Hash className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      {t("onboarding.initialScore", { count: Math.min(certificates.length * 10, 50) })}
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
              {t("onboarding.submit")}
            </Button>
            {/* Pode explorar a aplicação e preencher depois; sem estes dados não pode vender. */}
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/catalogo")}
              disabled={loading}
            >
              {t("onboarding.later")}
            </Button>
            <p className="text-center text-xs text-muted-foreground">{t("onboarding.laterHint")}</p>
          </form>
        </div>
      </div>
    </main>
  );
};

export default FarmerOnboarding;
