import { Link, useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Home,
  List,
  PlusCircle,
  Shield,
  Settings as SettingsIcon,
  LayoutGrid,
  SlidersHorizontal,
  Users,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import logoUrl from "@/assets/cedar-rose-logo.png";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useAuth } from "@/app/auth-context";
import { completeLogout } from "@/lib/auth-session";

type NavItem = { to: string; label: string; icon: LucideIcon };

const BUSINESS_NAV: NavItem[] = [
  { to: "/", label: "Overview", icon: Home },
  { to: "/cases", label: "All Cases", icon: List },
  { to: "/new-request", label: "New Request", icon: PlusCircle },
  { to: "/audit-log", label: "Audit Log", icon: Shield },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin/form-builder", label: "Form Builder", icon: LayoutGrid },
  { to: "/admin/configuration", label: "Platform Configuration", icon: SlidersHorizontal },
  { to: "/admin/users", label: "User Roles & Access", icon: Users },
];

const SIDEBAR_WIDTH = 240;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [refreshed, setRefreshed] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setRefreshed(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = async () => {
    await completeLogout(queryClient);
    navigate("/login", { replace: true });
  };

  const displayName = user?.name ?? "User";
  const displayTitle = user?.title ?? "";
  const initials = user?.initials ?? "U";

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  const renderItem = (item: NavItem) => {
    const active = isActive(item.to);
    const Icon = item.icon;
    return (
      <li key={item.to}>
        <Link
          to={item.to}
          className={[
            "relative flex items-center gap-3 px-4 h-10 text-sm text-white/85 transition-colors",
            "hover:bg-white/5 hover:text-white",
            active ? "bg-white/10 text-white font-medium" : "",
          ].join(" ")}
        >
          {active && (
            <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-white" />
          )}
          <Icon className="h-4 w-4 shrink-0" />
          <span>{item.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <aside
        className="fixed inset-y-0 left-0 flex flex-col text-white bg-navy"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b border-white/10">
          <img src={logoUrl} alt="Cedar Rose" className="h-8 w-8 rounded-sm bg-white/10 p-0.5" />
          <span className="text-sm font-semibold tracking-tight">Cedar Rose</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Business Dashboard
          </div>
          <ul className="flex flex-col">{BUSINESS_NAV.map(renderItem)}</ul>

          {isAdmin && (
            <>
              <div className="my-3 mx-4 h-px bg-white/10" />
              <div className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Admin Panel
              </div>
              <ul className="flex flex-col">{ADMIN_NAV.map(renderItem)}</ul>
            </>
          )}
        </div>

        <div className="border-t border-white/10 px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center text-[11px] font-semibold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white truncate">{displayName}</div>
            <div className="text-[11px] text-white/50 truncate">{displayTitle}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="text-white/60 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <div style={{ marginLeft: SIDEBAR_WIDTH }} className="flex flex-col min-h-screen">
        <header className="bg-navy text-white">
          <div className="flex items-center h-14 px-6">
            <div className="flex-1">
              <h1 className="text-base font-semibold tracking-tight">
                Questionnaire Operations Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/80">
              <span className="hidden sm:inline">
                Last refreshed {format(refreshed, "HH:mm:ss")}
              </span>
              <NotificationBell />
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-white/15 flex items-center justify-center text-[11px] font-semibold">
                  {initials}
                </div>
                <span className="hidden md:inline">{displayName}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>

        <footer className="px-6 py-3 text-xs text-muted-foreground border-t border-border">
          © CedarRose · Internal use only · Build {format(new Date(), "yyyy.MM.dd")}
        </footer>
      </div>
    </div>
  );
}
