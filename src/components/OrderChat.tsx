import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import TranslatedText from "@/components/TranslatedText";
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
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { formatDateTime } from "@/lib/format";
import { translateServerMessage } from "@/lib/server-messages";

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
  const { t } = useTranslation("orders");
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
        if (file.size > MAX_FILE) throw new Error(i18n.t("orders:chat.fileTooBig"));
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
    } catch (e) {
      // Os erros do Supabase são objetos com `message`, não instâncias de Error.
      toast.error(translateServerMessage((e as { message?: string })?.message ?? t("chat.sendFailed")));
    } finally {
      setSending(false);
    }
  };

  if (closed) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        {t("chat.archived")}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-sm font-medium text-foreground">{t("chat.title")}</p>
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
            {t("chat.empty")}
          </p>
        ) : (
          messages.map((m) => <Bubble key={m.id} m={m} viewerRole={viewerRole} />)
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-border p-3">
        <label className="cursor-pointer rounded-md p-2 hover:bg-muted" title={t("chat.attach")}>
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
            placeholder={viewerRole === "cliente" ? t("chat.toFarmer") : t("chat.toClient")}
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
      <div className="mx-auto max-w-md rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <TranslatedText type="chat" id={m.id} field="content" text={m.content} as="p" className="whitespace-pre-wrap" toggle />
          </div>
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
        {/* As mensagens da outra parte são traduzidas para o idioma de quem lê; as próprias ficam como foram escritas. */}
        {m.content &&
          (mine ? (
            <p className="whitespace-pre-wrap break-words">{m.content}</p>
          ) : (
            <TranslatedText
              type="chat"
              id={m.id}
              field="content"
              text={m.content}
              as="p"
              className="whitespace-pre-wrap break-words"
              toggle
            />
          ))}
        {m.attachment_url && (
          <a
            href={m.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs underline opacity-90"
          >
            <Paperclip className="h-3 w-3" /> {i18n.t("orders:chat.attachment")}
          </a>
        )}
        <p className="mt-1 text-[10px] opacity-70">
          {formatDateTime(m.created_at)}
        </p>
      </div>
    </div>
  );
};

export const ReportDialog = ({
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
  const { t } = useTranslation("orders");
  const [reason, setReason] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [warningAccepted, setWarningAccepted] = useState(false);
  // O aviso legal aplica-se a quem denuncia um agricultor.
  const needsWarning = reporterRole === "cliente";

  const submit = async () => {
    if (!user) return;
    if (reason.trim().length < 5) {
      toast.error(t("report.reasonTooShort"));
      return;
    }
    if (!proof) {
      toast.error(t("report.proofRequired"));
      return;
    }
    if (proof.size > MAX_FILE) {
      toast.error(t("report.proofTooBig"));
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
      toast.success(t("report.filed"));
      setReason("");
      setProof(null);
      setWarningAccepted(false);
      onOpenChange(false);
    } catch (e) {
      toast.error(translateServerMessage((e as { message?: string })?.message ?? t("report.failed")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
          <AlertTriangle className="h-4 w-4" /> {t("report.button")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("report.title")}</DialogTitle>
          <DialogDescription>
            {t("report.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 2000))}
            placeholder={t("report.placeholder")}
            rows={4}
          />
          <div>
            <label className="text-sm font-medium text-foreground">
              {t("report.proof")} <span className="text-destructive">*</span>
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setProof(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
            />
            {proof && <p className="mt-1 text-xs text-muted-foreground">📎 {proof.name}</p>}
          </div>
          {needsWarning && (
            <label htmlFor="report-warning" className="flex cursor-pointer items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-foreground">
              <Checkbox
                id="report-warning"
                checked={warningAccepted}
                onCheckedChange={(v) => setWarningAccepted(v === true)}
                className="mt-0.5"
              />
              <span>
                {t("report.warning")}
              </span>
            </label>
          )}
          <Button onClick={submit} disabled={submitting || (needsWarning && !warningAccepted)} className="w-full">
            {submitting ? t("report.sending") : t("report.send")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderChat;
