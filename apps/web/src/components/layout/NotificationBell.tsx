import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Clock, ClipboardList, AlertTriangle, ArrowRight } from "lucide-react";
import type { Notification, NotifType } from "@/types";
import { notificationsService } from "@/services";

const ICON_STYLE: Record<NotifType, { bg: string; Icon: React.ComponentType<{ className?: string }> }> = {
  submission: { bg: "bg-emerald-500", Icon: Check },
  expired: { bg: "bg-red-500", Icon: Clock },
  review: { bg: "bg-blue-500", Icon: ClipboardList },
  blocked: { bg: "bg-orange-500", Icon: AlertTriangle },
  reminder: { bg: "bg-amber-500", Icon: Bell },
  stale: { bg: "bg-amber-500", Icon: Bell },
  api: { bg: "bg-purple-500", Icon: ArrowRight },
};

const ROUTES: Record<NotifType, string> = {
  submission: "/cases",
  expired: "/cases",
  review: "/cases",
  blocked: "/cases",
  reminder: "/cases",
  stale: "/cases",
  api: "/audit-log",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => notificationsService.list(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = items.filter((i) => !i.read).length;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleClick = (n: Notification) => {
    if (!n.read) markReadMutation.mutate(n.id);
    setOpen(false);
    if (n.caseId) {
      navigate(`/cases?caseId=${encodeURIComponent(n.caseId)}`);
      return;
    }
    navigate(ROUTES[n.type]);
  };

  const markAll = () => markAllMutation.mutate();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex items-center justify-center h-7 w-7 text-white hover:text-white/80 transition-colors"
      >
        <Bell className="h-5 w-5" strokeWidth={2} />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold text-white flex items-center justify-center"
            style={{ backgroundColor: "#E24B4A" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 bg-white text-foreground overflow-hidden"
          style={{
            width: 380,
            maxHeight: 480,
            border: "0.5px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          }}
        >
          <div className="flex flex-col max-h-[480px]">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[15px] font-bold text-navy">Notifications</span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  className="text-[12px] text-blue-600 hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className="h-px bg-gray-200" />

            <div className="overflow-y-auto flex-1">
              {items.length === 0 ? (
                <EmptyState />
              ) : (
                items.map((n) => {
                  const { bg, Icon } = ICON_STYLE[n.type];
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleClick(n)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                      style={{ backgroundColor: n.read ? "#fff" : "#F0F6FC" }}
                    >
                      <div className={`shrink-0 h-8 w-8 rounded-full ${bg} flex items-center justify-center`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-gray-900 leading-tight">{n.title}</div>
                        <div className="text-[12px] text-gray-600 mt-0.5 line-clamp-2">{n.body}</div>
                        <div className="text-[11px] text-gray-400 mt-1">{n.time}</div>
                      </div>
                      {!n.read && (
                        <div className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-navy" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4">
      <Bell className="h-10 w-10 text-gray-300" strokeWidth={1.5} />
      <div className="text-[14px] text-gray-500 mt-3">You're all caught up</div>
      <div className="text-[12px] text-gray-400 mt-1">No new notifications</div>
    </div>
  );
}
