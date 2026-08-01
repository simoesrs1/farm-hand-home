import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  order_id: string | null;
  type: string;
}

const NotificationBell = () => {
  const { user, activeMode } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id,title,message,read,created_at,order_id,type")
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as Notification[]) ?? []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel("notifications:" + user.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (!user) return null;
  const unread = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClick = (n: Notification) => {
    setOpen(false);
    if (n.order_id) {
      const base = profile?.profile_type === "vendedor" ? "/agricultor/encomendas" : "/encomendas";
      navigate(`${base}?id=${n.order_id}`);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (o && unread > 0) markAllRead(); }}>
      <DropdownMenuTrigger
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="font-semibold text-foreground">Notificações</p>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sem notificações.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => (
              <li key={n.id} className={`${!n.read ? "bg-primary/5" : ""}`}>
                <button
                  type="button"
                  onClick={() => handleClick(n)}
                  className="block w-full px-4 py-3 text-left transition-colors hover:bg-secondary"
                >
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("pt-PT")}
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
