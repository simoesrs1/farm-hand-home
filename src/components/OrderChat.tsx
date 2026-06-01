import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, Paperclip, Send, ShieldAlert } from "lucide-react";

interface Message {
  id: string;
  order_id: string;
  sender_id: string | null;
  sender_role: "cliente" | "agricultor" | "sistema";
  content: string | null;
  attachment_url: string | null;
  attachment_mime: string | null;
  created_at: string;
}

interface Props {
  orderId: string;
  viewerRole: "cliente" | "agricultor";
  deliveredAt: string | null;
}

const MAX_FILE = 8 * 1024 * 1024; // 8 MB
const MAX_LEN = 2000;

async function uploadToOrder(orderId: string, file: File) {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${orderId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("order-attachments")
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("order-attachments").createSignedUrl
    ? await supabase.storage.from("order-attachments").createSignedUrl(path, 60 * 60 * 24 * 7)
    : { data: { signedUrl: "" } };
  return { url: data?.signedUrl ?? "", path, mime: file.type };
}

const OrderChat = ({ orderId, viewerRole, deliveredAt }: Props) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const closed =
    deliveredAt && Date.now() - new Date(deliveredAt).getTime() > 5 * 24 * 60 * 60 * 1000;

  useEffect(() => {
    if (!user || closed) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("order_chat_messages")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (!cancelled) setMessages((data as Message[]) ?? []);
    })();
    const ch = supabase
      .channel(`chat:${orderId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_chat_messages", filter: `order_id=eq.${orderId}` },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (payload.new as Message).id)
              ? prev
              : [...prev, payload.new as Message],
          );
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [orderId, user, closed]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    if (!user) return;
    const content = text.trim().slice(0, MAX_LEN) || null;
    if (!content && !file) return;
    setSending(true);
    try {
      let attachment_url: string | null = null;
      let attachment_mime: string | null = null;
      if (file) {
        if (file.size > MAX_FILE) throw new Error("Ficheiro acima de 8MB");
        const up = await uploadToOrder(orderId, file);
        attachment_url = up.url;
        attachment_mime = up.mime;
      }
      const { error } = await supabase.from("order_chat_messages").insert({
        order_id: orderId,
        sender_id: user.id,
        sender_role: viewerRole,
        content,
        attachment_url,
        attachment_mime,
      });
      if (error) throw error;
      setText("");
      setFile(null);
    } catch (e: any) {
      toast.error(e.message ?? "Não foi possível enviar a mensagem");
    } finally {
      setSending(false);
    }
  };

  if (closed) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        A conversa desta encomenda foi arquivada (mais de 5 dias após a entrega).
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-sm font-medium text-foreground">Conversa da encomenda</p>
        <ReportDialog
          orderId={orderId}
          reporterRole={viewerRole}
          open={reportOpen}
          onOpenChange={setReportOpen}
        />
      </div>

      <div ref={scroller} className="max-h-80 overflow-y-auto px-4 py-3 space-y-2">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Sem mensagens. Envia a primeira para começares a conversa.
          </p>
        ) : (
          messages.map((m) => <Bubble key={m.id} m={m} viewerRole={viewerRole} />)
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-border p-3">
        <label className="cursor-pointer rounded-md p-2 hover:bg-muted" title="Anexar ficheiro">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="flex-1">
          {file && (
            <p className="mb-1 truncate text-xs text-muted-foreground">📎 {file.name}</p>
          )}
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
            placeholder={`Mensagem para o ${viewerRole === "cliente" ? "agricultor" : "cliente"}...`}
            rows={2}
            className="resize-none"
          />
        </div>
        <Button onClick={send} disabled={sending || (!text.trim() && !file)} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const Bubble = ({
  m,
  viewerRole,
}: {
  m: Message;
  viewerRole: "cliente" | "agricultor";
}) => {
  if (m.sender_role === "sistema") {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="whitespace-pre-wrap">{m.content}</p>
        </div>
      </div>
    );
  }
  const mine = m.sender_role === viewerRole;
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
          mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}
      >
        {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
        {m.attachment_url && (
          <a
            href={m.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs underline opacity-90"
          >
            <Paperclip className="h-3 w-3" /> Anexo
          </a>
        )}
        <p className="mt-1 text-[10px] opacity-70">
          {new Date(m.created_at).toLocaleString("pt-PT")}
        </p>
      </div>
    </div>
  );
};

const ReportDialog = ({
  orderId,
  reporterRole,
  open,
  onOpenChange,
}: {
  orderId: string;
  reporterRole: "cliente" | "agricultor";
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (reason.trim().length < 5) {
      toast.error("Descreve o motivo (mínimo 5 caracteres)");
      return;
    }
    if (!proof) {
      toast.error("A prova é obrigatória para abrir uma denúncia");
      return;
    }
    if (proof.size > MAX_FILE) {
      toast.error("Prova acima de 8MB");
      return;
    }
    setSubmitting(true);
    try {
      const up = await uploadToOrder(orderId, proof);
      const { error } = await supabase.from("order_reports").insert({
        order_id: orderId,
        reporter_id: user.id,
        reporter_role: reporterRole,
        reason: reason.trim().slice(0, 2000),
        proof_url: up.url,
        proof_mime: up.mime,
      });
      if (error) throw error;
      toast.success("Denúncia enviada. O suporte foi notificado.");
      setReason("");
      setProof(null);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Não foi possível abrir a denúncia");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
          <AlertTriangle className="h-4 w-4" /> Denunciar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir denúncia</DialogTitle>
          <DialogDescription>
            Descreve o que se passou e anexa uma prova (foto, PDF). A equipa de suporte entra
            automaticamente na conversa para ajudar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 2000))}
            placeholder="Descreve o problema..."
            rows={4}
          />
          <div>
            <label className="text-sm font-medium text-foreground">
              Prova (obrigatória) <span className="text-destructive">*</span>
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setProof(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
            />
            {proof && <p className="mt-1 text-xs text-muted-foreground">📎 {proof.name}</p>}
          </div>
          <Button onClick={submit} disabled={submitting} className="w-full">
            {submitting ? "A enviar..." : "Enviar denúncia"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderChat;
