import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const COMMISSION = 0.10;

const NewProduct = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [loadingFarmer, setLoadingFarmer] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("kg");
  const [isOrganic, setIsOrganic] = useState(false);
  const [isLactoseFree, setIsLactoseFree] = useState(false);
  const [hasModifications, setHasModifications] = useState(false);
  const [modificationsDescription, setModificationsDescription] = useState("");
  const [farmerPrice, setFarmerPrice] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (profile && profile.profile_type !== "vendedor") {
      navigate("/");
      return;
    }
    const load = async () => {
      const { data, error } = await supabase
        .from("farmer_details")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        toast({ title: "Erro a carregar perfil", description: error.message, variant: "destructive" });
      }
      setFarmerId(data?.id ?? null);
      setLoadingFarmer(false);
    };
    load();
  }, [user, profile, navigate]);

  const farmerPriceNumber = useMemo(() => {
    const n = parseFloat(farmerPrice.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [farmerPrice]);

  const clientPrice = useMemo(
    () => Math.round(farmerPriceNumber * (1 + COMMISSION) * 100) / 100,
    [farmerPriceNumber]
  );

  const handleFilesAdd = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list).filter((f) =>
      f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    setFiles((prev) => [...prev, ...incoming].slice(0, 8));
  };

  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !farmerId) {
      toast({ title: "Perfil de agricultor não encontrado", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Indique o nome do produto", variant: "destructive" });
      return;
    }
    if (farmerPriceNumber <= 0) {
      toast({ title: "Defina um preço válido", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const mediaUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-media")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        mediaUrls.push(path);
      }

      const { error } = await supabase.from("products").insert({
        farmer_id: farmerId,
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        unit,
        is_organic: isOrganic,
        is_lactose_free: isLactoseFree,
        has_modifications: hasModifications,
        modifications_description: hasModifications
          ? modificationsDescription.trim() || null
          : null,
        farmer_price: farmerPriceNumber,
        client_price: clientPrice,
        media_urls: mediaUrls,
      });
      if (error) throw error;

      toast({ title: "Produto adicionado", description: "O artigo está agora disponível." });
      navigate("/catalogo");
    } catch (err: any) {
      toast({ title: "Erro a guardar produto", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingFarmer) {
    return (
      <div className="container py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!farmerId) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground">Complete o registo de agricultor para adicionar produtos.</p>
        <Button className="mt-4" onClick={() => navigate("/onboarding/agricultor")}>Completar perfil</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <h1 className="font-display text-3xl font-bold text-foreground">Adicionar produto</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Preencha os detalhes do artigo que pretende colocar à venda.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Media */}
        <Card className="p-5">
          <Label className="text-base">Fotografias e vídeos</Label>
          <p className="text-xs text-muted-foreground mt-1">Até 8 ficheiros (imagens ou vídeos).</p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {files.map((file, i) => (
              <div key={i} className="relative aspect-square rounded-lg border border-border bg-muted overflow-hidden">
                {file.type.startsWith("image/") ? (
                  <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" />
                ) : (
                  <video src={URL.createObjectURL(file)} className="h-full w-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 rounded-md bg-background/90 p-1 text-destructive hover:bg-background"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {files.length < 8 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:bg-secondary">
                <Upload className="h-5 w-5" />
                <span className="text-xs">Adicionar</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => handleFilesAdd(e.target.files)}
                />
              </label>
            )}
          </div>
        </Card>

        {/* Basic */}
        <Card className="p-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do produto *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Tomate cherry" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Hortícolas, Frutas..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, un, dúzia..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Conte mais sobre o produto, origem, sabor, como é cultivado..."
            />
          </div>
        </Card>

        {/* Properties */}
        <Card className="p-5 space-y-4">
          <h2 className="font-medium">Características</h2>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="organic" className="cursor-pointer">Biológico</Label>
              <p className="text-xs text-muted-foreground">Cultivado sem químicos sintéticos.</p>
            </div>
            <Switch id="organic" checked={isOrganic} onCheckedChange={setIsOrganic} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="lactose" className="cursor-pointer">Sem lactose</Label>
              <p className="text-xs text-muted-foreground">Indique se o produto não contém lactose.</p>
            </div>
            <Switch id="lactose" checked={isLactoseFree} onCheckedChange={setIsLactoseFree} />
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="modified" className="cursor-pointer">Foi alterado / processado</Label>
                <p className="text-xs text-muted-foreground">Ex: pasteurizado, fermentado, seco.</p>
              </div>
              <Switch id="modified" checked={hasModifications} onCheckedChange={setHasModifications} />
            </div>
            {hasModifications && (
              <Textarea
                className="mt-3"
                rows={3}
                value={modificationsDescription}
                onChange={(e) => setModificationsDescription(e.target.value)}
                placeholder="Descreva o que foi feito ao produto."
              />
            )}
          </div>
        </Card>

        {/* Pricing */}
        <Card className="p-5 space-y-4">
          <h2 className="font-medium">Preço</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="farmer-price">Quanto quer receber (€) *</Label>
              <Input
                id="farmer-price"
                type="number"
                step="0.01"
                min="0"
                value={farmerPrice}
                onChange={(e) => setFarmerPrice(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">Valor que recebe por {unit || "unidade"}.</p>
            </div>
            <div className="space-y-2">
              <Label>Preço final para o cliente</Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm font-semibold text-foreground">
                {clientPrice.toFixed(2)} € / {unit || "un"}
              </div>
              <p className="text-xs text-muted-foreground">Inclui {Math.round(COMMISSION * 100)}% da FarmConnect.</p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            Publicar produto
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewProduct;
