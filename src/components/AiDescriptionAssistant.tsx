import { useState } from "react";
import { Check, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { generateDescription, hasCopyInput, type CopyFacts, type CopyKind } from "@/lib/ai-description";

interface AiDescriptionAssistantProps {
  kind: CopyKind;
  /** Texto atual do campo Descrição (a base para a IA). */
  draft: string;
  /** Dados do formulário que a IA pode usar (título, duração, quartos...). */
  facts: CopyFacts;
  /** Fotografias novas, ainda não carregadas. */
  files?: File[];
  /** Fotografias já guardadas no bucket product-media. */
  storedPaths?: string[];
  onAccept: (text: string) => void;
}

/**
 * "Escrever com IA": mostra uma proposta por baixo do campo Descrição, que o
 * agricultor aceita, pede outra ou descarta. Nunca substitui o texto sem aceitação.
 */
const AiDescriptionAssistant = ({ kind, draft, facts, files = [], storedPaths = [], onAccept }: AiDescriptionAssistantProps) => {
  const [proposal, setProposal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!hasCopyInput(draft, facts, files, storedPaths)) {
      toast({ title: "Escreva um pequeno texto ou adicione uma fotografia primeiro", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      setProposal(await generateDescription({ kind, draft, facts, files, storedPaths }));
    } catch (err) {
      toast({
        title: "Não foi possível escrever com IA",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {!proposal && (
        <>
          <Button type="button" variant="outline" size="sm" onClick={generate} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "A escrever..." : "Escrever com IA"}
          </Button>
          <p className="text-xs text-muted-foreground">
            A IA usa o seu texto, os dados do formulário e até 3 fotografias para propor uma descrição mais
            apelativa. Só substitui o seu texto se aceitar.
          </p>
        </>
      )}

      {proposal && (
        <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Proposta da IA
          </p>
          <p className="whitespace-pre-line text-sm text-foreground">{proposal}</p>
          <p className="text-xs text-muted-foreground">
            Confirme que o texto está correto antes de publicar: a descrição é da sua responsabilidade.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                onAccept(proposal);
                setProposal(null);
              }}
            >
              <Check className="h-4 w-4" /> Aceitar
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Gerar outra
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1.5"
              onClick={() => setProposal(null)}
              disabled={loading}
            >
              <X className="h-4 w-4" /> Descartar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiDescriptionAssistant;
