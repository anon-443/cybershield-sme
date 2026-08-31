import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { getDashboardShortcutPath } from "@/lib/dashboardShortcuts";
import { shouldUseCompactSidebar } from "@/lib/sidebarMode";
import { useTheme } from "@/contexts/ThemeContext";
import { SiteThemeToggle } from "@/components/SiteThemeToggle";
import { FileSearch, LayoutDashboard, LogOut, PanelLeft, ShieldCheck } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const menuItems = [
  { icon: ShieldCheck, label: "Assess a domain", path: "/" },
  { icon: LayoutDashboard, label: "Scan history", path: "/dashboard" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600"><ShieldCheck className="h-7 w-7" /></div>
            <h1 className="text-2xl font-semibold tracking-tight text-center text-slate-900">Sign in to protect your scan history</h1>
            <p className="text-sm text-slate-600 text-center max-w-sm">Your saved posture reports are private to your account. Sign in to continue.</p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar, setOpen } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const isReportRoute = location.startsWith("/report/");
  const isReportReadingMode = shouldUseCompactSidebar(location, isMobile);
  const { theme } = useTheme();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    if (isMobile) return;
    setOpen(!isReportReadingMode);
  }, [isReportReadingMode, isMobile, setOpen]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("report-dark", theme === "dark" && isReportRoute);
    return () => root.classList.remove("report-dark");
  }, [theme, isReportRoute]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || Boolean(target?.isContentEditable);
      const path = getDashboardShortcutPath({ key: event.key, altKey: event.altKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey, isTyping });
      if (!path) return;
      event.preventDefault();
      setLocation(path);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [setLocation]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div
        className="relative report-reading-rail"
        ref={sidebarRef}
        style={isReportReadingMode && !isMobile ? { width: "var(--sidebar-width-icon)", flexShrink: 0, background: "#ffffff", position: "relative", zIndex: 20 } : undefined}
      >
        {isReportReadingMode && !isMobile && (
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              inset: "0 auto 0 0",
              width: "var(--sidebar-width-icon)",
              background: "#ffffff",
              borderRight: "1px solid #e2e8f0",
              pointerEvents: "none",
              zIndex: 11,
            }}
          />
        )}
        <Sidebar
            collapsible="icon"
            reportSurface={isReportReadingMode}
            className="border-r-0 report-reading-surface"
            disableTransition={isResizing}
            style={{ "--sidebar": "#ffffff", "--sidebar-foreground": "#0f172a", "--sidebar-accent": "#f0f4f8", "--sidebar-accent-foreground": "#059669", "--sidebar-border": "#e2e8f0" } as CSSProperties}
          >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0 text-slate-700 hover:text-slate-900"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="report-sidebar-icon h-4 w-4" />
              </button>
              {!isCollapsed ? <div className="flex items-center gap-2 min-w-0"><span className="font-semibold tracking-[0.16em] text-sm truncate text-slate-800">CYBERSHIELD</span></div> : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item, index) => {
                const isActive = location === item.path;
                const shortcut = `Alt ${index + 1}`;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      aria-keyshortcuts={`Alt+${index + 1}`}
                      className={`h-10 transition-all font-normal ${isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}
                    >
                      <item.icon
                        className={`report-sidebar-icon h-4 w-4 shrink-0 transition-colors ${isActive ? "text-emerald-600 is-active" : "text-slate-500"}`}
                      />
                      <span>{item.label}</span>
                      {!isCollapsed && <kbd className="ml-auto rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] leading-none text-slate-600">{shortcut}</kbd>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
            {isReportReadingMode && (
              <div className="report-theme-control px-2 pt-2">
                <SiteThemeToggle compact />
              </div>
            )}
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-slate-100 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                  <Avatar className="h-9 w-9 border border-emerald-300/50 bg-emerald-50 text-emerald-700 shrink-0">
                    <AvatarFallback className="text-xs font-semibold bg-emerald-50 text-emerald-700">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-slate-800">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200 text-slate-800">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-slate-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className={isReportReadingMode ? "report-reading-inset" : undefined}>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "CyberShield"}
                  </span>
                </div>
              </div>
            </div>
            <SiteThemeToggle compact className="report-mobile-theme-toggle" />
          </div>
        )}
        <main className="flex-1 p-4 md:p-7">{children}</main>
      </SidebarInset>
    </>
  );
}
