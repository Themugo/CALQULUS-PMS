import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, BellRing, Check, CheckCheck, CreditCard, FileText, UserPlus,
  AlertTriangle, Clock, Wrench, MessageSquare, X, LucideIcon,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Badge } from "@/shared/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useManagerScope } from "@/shared/hooks/useManagerScope";
import { useToast } from "@/shared/hooks/use-toast";
import { logError } from "@/shared/lib/errorLogger";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/shared/lib/utils";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  action_url: string | null;
  action_label: string | null;
  priority: string;
}

interface MaintenanceInsert {
  id: string;
  title: string;
  description: string;
  tenant_name: string;
  property_name: string;
  unit_number: string | null;
  priority: string;
  manager_id: string | null;
}

const TYPE_ICON: Record<string, { icon: LucideIcon; bg: string }> = {
  payment:     { icon: CreditCard,     bg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" },
  maintenance: { icon: Wrench,         bg: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" },
  notice:      { icon: FileText,       bg: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400" },
  alert:       { icon: AlertTriangle,  bg: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" },
  reminder:    { icon: Clock,          bg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  broadcast:   { icon: MessageSquare,  bg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400" },
  tenant:      { icon: UserPlus,       bg: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400" },
  info:        { icon: Bell,           bg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

const PRIORITY_RING: Record<string, string> = {
  urgent: "ring-2 ring-red-400",
  high:   "ring-2 ring-amber-400",
};

const QUERY_KEY = "manager-notifications";

export function NotificationsDropdown() {
  const { user } = useAuth();
  const { managerId } = useManagerScope();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("in_app_notifications")
        .select("id, title, body, type, is_read, is_dismissed, created_at, action_url, action_label, priority")
        .eq("user_id", user!.id)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) logError("NotificationsDropdown.fetch", error);
      return (data || []) as Notification[];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] });
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // Channel 1: instant refresh on new in_app_notifications rows
    const notifChannel = supabase
      .channel(`manager-notif-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "in_app_notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const n = payload.new as Notification;
        // Optimistic prepend so the bell lights up before re-fetch
        queryClient.setQueryData<Notification[]>(
          [QUERY_KEY, user.id],
          (old = []) => [n, ...old],
        );
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "in_app_notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => { invalidate(); })
      .subscribe();

    return () => { supabase.removeChannel(notifChannel); };
  }, [user?.id, queryClient, invalidate]);

  useEffect(() => {
    if (!managerId) return;

    // Channel 2: live toast + notification row on new maintenance requests
    const maintChannel = supabase
      .channel(`manager-maint-${managerId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "maintenance_requests",
        filter: `manager_id=eq.${managerId}`,
      }, async (payload) => {
        const req = payload.new as MaintenanceInsert;
        const unitLabel = req.unit_number ? ` · Unit ${req.unit_number}` : "";
        const notifTitle = `New maintenance request`;
        const notifBody = `${req.title} — ${req.tenant_name} at ${req.property_name}${unitLabel}`;

        // Show a live toast immediately
        toast({
          title: notifTitle,
          description: notifBody,
          duration: 6000,
        });

        // Also insert a persistent in_app_notification for the manager
        if (user?.id) {
          const { error } = await supabase.from("in_app_notifications").insert({
            user_id: user.id,
            title: notifTitle,
            body: notifBody,
            type: "maintenance",
            priority: req.priority === "urgent" ? "urgent" : req.priority === "high" ? "high" : "normal",
            action_url: "/maintenance",
            action_label: "View request",
          });
          if (error) logError("NotificationsDropdown.insertMaintNotif", error);
          // The INSERT channel above will optimistically prepend the row immediately
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(maintChannel); };
  }, [managerId, user?.id, toast]);

  const unread = notifications.filter(n => !n.is_read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("in_app_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const ids = notifications.filter(n => !n.is_read).map(n => n.id);
      if (!ids.length) return;
      await supabase
        .from("in_app_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in("id", ids);
    },
    onSuccess: invalidate,
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("in_app_notifications")
        .update({ is_dismissed: true })
        .eq("id", id);
    },
    onSuccess: invalidate,
  });

  const handleClick = (notif: Notification) => {
    if (!notif.is_read) markRead.mutate(notif.id);
    if (notif.action_url) navigate(notif.action_url);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 touch-manipulation"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        >
          {unread > 0
            ? <BellRing className="h-4 w-4 text-amber-500 animate-[wiggle_0.4s_ease-in-out]" />
            : <Bell className="h-4 w-4" />
          }
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center leading-none">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <p className="text-sm font-semibold flex items-center gap-2">
            Notifications
            {unread > 0 && (
              <Badge variant="destructive" className="text-xs h-4 px-1">{unread}</Badge>
            )}
          </p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Bell className="h-7 w-7 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs opacity-60 mt-0.5">New activity will appear here instantly</p>
            </div>
          ) : (
            notifications.map(notif => {
              const cfg = TYPE_ICON[notif.type] ?? TYPE_ICON.info;
              const Icon = cfg.icon;
              const priorityRing = PRIORITY_RING[notif.priority] ?? "";
              return (
                <div
                  key={notif.id}
                  className={cn(
                    "group flex items-start gap-3 px-3 py-3 border-b border-border/50 last:border-0 transition-colors",
                    notif.is_read
                      ? "hover:bg-muted/40"
                      : "bg-amber-400/6 hover:bg-amber-400/10 dark:bg-amber-400/[0.04]",
                    notif.action_url ? "cursor-pointer" : "cursor-default",
                  )}
                  onClick={() => handleClick(notif)}
                >
                  {/* Icon */}
                  <div className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                    cfg.bg,
                    priorityRing,
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 justify-between">
                      <p className={cn(
                        "text-xs truncate",
                        notif.is_read ? "font-medium" : "font-semibold",
                      )}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notif.body}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </p>
                      {notif.action_label && (
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          {notif.action_label} →
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dismiss */}
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 mt-0.5"
                    onClick={e => { e.stopPropagation(); dismiss.mutate(notif.id); }}
                    aria-label="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground/60">Real-time · updates instantly</span>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground gap-1"
                onClick={() => { notifications.forEach(n => { if (!n.is_read) markRead.mutate(n.id); }); }}
              >
                <Check className="h-3 w-3" />
                Clear read
              </Button>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
