import { useState } from "react";
import { NavLink, Outlet, useLocation, useOutletContext } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { safeGetItem, safeSetItem } from "@/lib/storage";
import {
  MessageSquare,
  LayoutDashboard,
  Users,
  Database,
  TrendingUp,
  Settings,
  Sun,
  Moon,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SessionList } from "@/features/chat/components/SessionList";

const NAV_ITEMS = [
  { to: "/chat", label: "Chat", icon: MessageSquare, roles: ["admin", "developer", "user"] },
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { to: "/admin/users", label: "Users", icon: Users, roles: ["admin"] },
  { to: "/admin/ingestion", label: "Ingestion", icon: Database, roles: ["admin", "developer"] },
  { to: "/admin/popular", label: "Popular", icon: TrendingUp, roles: ["admin", "developer"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["admin", "developer", "user"] },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/chat": "Chat",
  "/admin/dashboard": "Dashboard",
  "/admin/users": "Users",
  "/admin/ingestion": "Ingestion",
  "/admin/popular": "Popular Questions",
  "/settings": "Settings",
  "/dashboard": "Dashboard",
  "/users": "Users",
  "/ingestion": "Ingestion",
};

interface SidebarContextValue {
  sidebarCollapsed: boolean;
}

export function useSidebarContext() {
  return useOutletContext<SidebarContextValue>();
}

function SidebarContent({
  collapsed,
  showSessions,
  onToggle,
  onNavClick,
  resolvedTheme,
  onThemeToggle,
  onLogout,
}: {
  collapsed: boolean;
  showSessions: boolean;
  onToggle?: () => void;
  onNavClick?: () => void;
  resolvedTheme: "light" | "dark";
  onThemeToggle: () => void;
  onLogout: () => void;
}) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Toggle + title row */}
      <div className={`flex items-center h-12 ${collapsed ? "justify-center" : "px-3 gap-2"}`}>
        {onToggle && (
          <button
            onClick={onToggle}
            className="w-9 h-9 flex items-center justify-center text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0 rounded-lg"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
        {!collapsed && (
          <span className="font-semibold text-sm text-sidebar-foreground truncate">BookStack RAG</span>
        )}
      </div>

      {/* Nav items */}
      <nav className={`shrink-0 space-y-0.5 ${collapsed ? "px-2" : "px-3"}`}>
        {NAV_ITEMS.filter((item) => user && (item.roles as readonly string[]).includes(user.role)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg transition-colors duration-150 text-sm font-medium ${
                collapsed ? "w-full h-9 justify-center" : "px-3 py-2.5"
              } ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`
            }
            aria-label={item.label}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Session history — only when expanded and on chat page */}
      {showSessions && !collapsed && (
        <div className="flex-1 min-h-0 border-t border-sidebar-border mt-2">
          <SessionList onClose={onNavClick} />
        </div>
      )}

      {/* Spacer when no sessions visible */}
      {(!showSessions || collapsed) && <div className="flex-1" />}

      {/* Bottom section: user + theme + logout */}
      <div className="border-t border-sidebar-border px-3 py-2">
        {/* User row with inline actions */}
        <div className={`flex items-center gap-2 ${collapsed ? "flex-col" : ""}`}>
          <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
            {user?.username?.[0]?.toUpperCase() ?? "?"}
          </div>
          {!collapsed && (
            <p className="flex-1 text-sm font-medium truncate text-sidebar-foreground">{user?.username}</p>
          )}
          <div className={`flex items-center ${collapsed ? "gap-0.5" : "gap-0.5"}`}>
            <button
              onClick={onThemeToggle}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title={resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={onLogout}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-sidebar-accent transition-colors"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => safeGetItem("sidebar_collapsed") !== "false");
  const [mobileOpen, setMobileOpen] = useState(false);

  const isChatPage = location.pathname.startsWith("/chat");

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    safeSetItem("sidebar_collapsed", String(next));
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] ?? "Chat";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border transition-all duration-200 ${
          collapsed ? "w-[48px]" : "w-[260px]"
        }`}
      >
        <SidebarContent
          collapsed={collapsed}
          showSessions={isChatPage}
          onToggle={toggleCollapsed}
          resolvedTheme={resolvedTheme}
          onThemeToggle={toggleTheme}
          onLogout={logout}
        />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopBar — minimal on chat, full on other pages */}
        {!isChatPage && (
          <header className="flex items-center justify-between h-12 px-4 border-b border-border bg-background shrink-0">
            <div className="flex items-center gap-2">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[260px]">
                  <SidebarContent
                    collapsed={false}
                    showSessions={false}
                    onNavClick={() => setMobileOpen(false)}
                    resolvedTheme={resolvedTheme}
                    onThemeToggle={toggleTheme}
                    onLogout={logout}
                  />
                </SheetContent>
              </Sheet>
              <h1 className="text-lg font-semibold">{pageTitle}</h1>
            </div>
          </header>
        )}

        {/* Mobile menu for chat page */}
        {isChatPage && (
          <div className="md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="m-2" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[260px]">
                <SidebarContent
                  collapsed={false}
                  showSessions={true}
                  onNavClick={() => setMobileOpen(false)}
                  resolvedTheme={resolvedTheme}
                  onThemeToggle={toggleTheme}
                  onLogout={logout}
                />
              </SheetContent>
            </Sheet>
          </div>
        )}

        <main className="flex-1 overflow-hidden">
          <Outlet context={{ sidebarCollapsed: collapsed } satisfies SidebarContextValue} />
        </main>
      </div>
    </div>
  );
}
