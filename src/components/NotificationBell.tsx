import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToastAction } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import TranslatedText from "@/components/TranslatedText";
import { toast } from "@/hooks/use-toast";
import { summarizeNotifications } from "@/lib/notification-summary";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { formatDateTime } from "@/lib/format";
import {
  audienceMode,
  isAudience,
  modeAudience,
  notificationRoute,
  otherAudience,
  type Audience,
} from "@/lib/notification-audience";

// Espera antes de mostrar o balão, para juntar notificações que chegam seguidas.
const BATCH_MS = 1500;

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  order_id: string | null;
  type: string;
  link: string | null;
  audience: Audience;
}

/**
 * Sino das notificações. Um agricultor tem dois perfis (cliente e agricultor):
 * o sino mostra só as notificações do perfil ativo, e as do outro perfil por
 * ler são assinaladas por uma bola de cores e por uma linha para trocar de perfil.
 */
const NotificationBell = () => {
  const { user, activeMode, canSwitchProfile, switchMode } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState<Notification[]>([]);
  const [otherUnread, setOtherUnread] = useState(0);
  const [open, setOpen] = useState(false);
  // Só quem tem os dois perfis vê as notificações separadas.
  const split = canSwitchProfile;
  const current = modeAudience(activeMode);
  const other = otherAudience(current);
  // Lidos dentro do canal de tempo real, que é criado uma vez por utilizador.
  const viewRef = useRef({ split, current });
  viewRef.current = { split, current };
  // Notificações recebidas em tempo real à espera do balão.
  const pending = useRef<Notification[]>([]);
  const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // O canal é criado uma vez por utilizador; o balão usa sempre o handleClick atual.
  const handleClickRef = useRef<(n: Notification) => void>(() => {});

  const load = useCallback(async () => {
    const { split: isSplit, current: audience } = viewRef.current;
    let query = supabase
      .from("notifications")
      .select("id,title,message,read,created_at,order_id,type,link,audience")
      .order("created_at", { ascending: false })
      .limit(20);
    if (isSplit) query = query.eq("audience", audience);
    const { data } = await query;
    setItems(((data ?? []) as Notification[]).map((n) => ({ ...n, audience: isAudience(n.audience) ? n.audience : "client" })));

    if (isSplit) {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("audience", otherAudience(audience))
        .eq("read", false);
      setOtherUnread(count ?? 0);
    } else {
      setOtherUnread(0);
    }
  }, []);

  const showBatch = () => {
    const batch = pending.current;
    pending.current = [];
    const summary = summarizeNotifications(batch);
    if (!summary) return;
    toast({
      title: summary.title,
      description: summary.description,
      action: (
        <ToastAction
          altText={i18n.t("common:notifications.view")}
          onClick={() => (batch.length === 1 ? handleClickRef.current(batch[0]) : setOpen(true))}
        >
          {i18n.t("common:notifications.viewShort")}
        </ToastAction>
      ),
    });
  };

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("notifications:" + user.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          load();
          const n = payload.new as Notification;
          const { split: isSplit, current: audience } = viewRef.current;
          // As do outro perfil só acendem a bola; o balão é para as do perfil ativo.
          if (isSplit && n.audience !== audience) return;
          pending.current.push(n);
          if (batchTimer.current) clearTimeout(batchTimer.current);
          batchTimer.current = setTimeout(showBatch, BATCH_MS);
        },
      )
      .subscribe();
    return () => {
      if (batchTimer.current) clearTimeout(batchTimer.current);
      pending.current = [];
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Ao entrar e ao trocar de perfil, a lista passa a ser a do perfil ativo.
  useEffect(() => {
    if (user) load();
  }, [user, split, current, load]);

  if (!user) return null;
  const unread = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    // Só as do perfil ativo: as do outro continuam por ler (e a bola acesa).
    let query = supabase.from("notifications").update({ read: true }).eq("read", false);
    if (split) query = query.eq("audience", current);
    await query;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const switchTo = async (audience: Audience) => {
    await switchMode(audienceMode(audience));
  };

  const handleClick = async (n: Notification) => {
    setOpen(false);
    // Notificação do outro perfil (ex.: a partir do balão): troca primeiro.
    if (split && n.audience !== current) await switchTo(n.audience);
    const route = notificationRoute(n);
    if (route) navigate(route);
  };

  handleClickRef.current = handleClick;

  const otherLabel = other === "farmer" ? "Farmer" : "Client";
  const ariaLabel =
    otherUnread > 0
      ? t(`notifications.ariaOther${otherLabel}`, { count: otherUnread })
      : t("notifications.title");

  return (
    <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (o && unread > 0) markAllRead(); }}>
      <DropdownMenuTrigger
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary"
        aria-label={ariaLabel}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        {/* Notificações por ler no outro perfil: bola com cores a mudar (para com "Pausar animações"). */}
        {otherUnread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background animate-rainbow-dot"
          />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto p-0">
        {otherUnread > 0 && (
          <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-4 py-3">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full animate-rainbow-dot" />
            <p className="flex-1 text-xs text-foreground">
              {t(`notifications.other${otherLabel}`, { count: otherUnread })}
            </p>
            <Button size="sm" variant="outline" className="h-7 shrink-0 px-2 text-xs" onClick={() => switchTo(other)}>
              {t(other === "farmer" ? "notifications.switchToFarmer" : "notifications.switchToClient")}
            </Button>
          </div>
        )}
        <div className="border-b border-border px-4 py-3">
          <p className="font-semibold text-foreground">
            {split ? t(current === "farmer" ? "notifications.titleFarmer" : "notifications.titleClient") : t("notifications.title")}
          </p>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("notifications.empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => (
              <li key={n.id} className={`${!n.read ? "bg-primary/5" : ""}`}>
                <button
                  type="button"
                  onClick={() => handleClick(n)}
                  className="block w-full px-4 py-3 text-left transition-colors hover:bg-secondary"
                >
                  <TranslatedText
                    type="notification"
                    id={n.id}
                    field="title"
                    text={n.title}
                    as="p"
                    className="text-sm font-medium text-foreground"
                  />
                  <TranslatedText
                    type="notification"
                    id={n.id}
                    field="message"
                    text={n.message}
                    as="p"
                    className="mt-0.5 text-xs text-muted-foreground"
                  />
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {formatDateTime(n.created_at)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
