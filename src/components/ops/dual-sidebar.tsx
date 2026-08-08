import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Cpu, Menu, Moon, PanelLeft, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/lib/theme";
import { isNavActive, navDomains } from "@/lib/nav";

const SIDEBAR_COOKIE = "sovereign_nav_expanded";

export function DualSidebar({
  secondaryOpen,
  onSecondaryOpenChange,
  mobileOpen,
  onMobileOpenChange,
  focusHidden = false,
}: {
  /** Expanded = full labels (AgentOS-style). Collapsed = icon rail only. */
  secondaryOpen: boolean;
  onSecondaryOpenChange: (open: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  /** Focus mode: fully hide the rail so the canvas can use full width. */
  focusHidden?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();
  const expanded = secondaryOpen && !focusHidden;

  const brand = (
    <div
      className={cn(
        "flex items-center border-b border-sidebar-border",
        expanded ? "gap-3 px-4 py-3.5" : "flex-col gap-2 px-2 py-3",
      )}
    >
      <Link
        to="/command"
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-coral text-white shadow-md"
        aria-label="Sovereign home"
        onClick={() => onMobileOpenChange(false)}
      >
        <Cpu className="size-4" aria-hidden="true" />
      </Link>
      {expanded && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-sidebar-accent-foreground">
            Sovereign
          </p>
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/55">
            Agentic Ops OS
          </p>
        </div>
      )}
    </div>
  );

  const nav = (
    <nav className={cn("flex-1 overflow-y-auto py-3", expanded ? "px-2" : "px-1.5")} aria-label="Main">
      {navDomains.map((domain) => (
        <div key={domain.id} className="mb-4 last:mb-0">
          {expanded ? (
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">
              {domain.label}
            </p>
          ) : (
            <div className="mx-auto mb-1.5 h-px w-6 bg-sidebar-border" aria-hidden="true" />
          )}
          <ul className="space-y-0.5">
            {domain.items.map((item) => {
              const active = isNavActive(pathname, item.url);
              return (
                <li key={item.url}>
                  <Link
                    to={item.url}
                    title={item.title}
                    onClick={() => onMobileOpenChange(false)}
                    className={cn(
                      "mb-0.5 flex items-center rounded-md text-[13px] transition-colors",
                      expanded ? "gap-2.5 px-2 py-1.5" : "justify-center px-0 py-2",
                      active
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <item.icon
                      className={cn("size-4 shrink-0", active ? "text-brand-coral" : "opacity-80")}
                      aria-hidden="true"
                    />
                    {expanded && <span className="truncate">{item.title}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div
      className={cn(
        "mt-auto space-y-2 border-t border-sidebar-border",
        expanded ? "px-3 py-3" : "px-1.5 py-2",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size={expanded ? "sm" : "icon"}
        className={cn(
          "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          expanded ? "h-8 w-full justify-start gap-2 px-2" : "mx-auto flex size-9",
        )}
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        {expanded && <span className="text-xs">{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
      </Button>
      {expanded && (
        <p className="px-1 text-[11px] leading-relaxed text-sidebar-foreground/45">
          Read-only · vendor neutral · multi-tenant
        </p>
      )}
    </div>
  );

  const panel = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {brand}
      {nav}
      {footer}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-[min(100%,16rem)] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:max-w-none"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          {/* Force expanded labels in the mobile sheet */}
          <div className="flex h-full w-60 flex-col">{panel}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out lg:flex",
        focusHidden ? "w-0 overflow-hidden border-r-0" : expanded ? "w-60" : "w-[3.75rem]",
      )}
      aria-label="Application sidebar"
      aria-hidden={focusHidden}
    >
      {panel}
      {!focusHidden && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-3.5 -right-3 z-40 hidden size-6 rounded-full border border-border bg-card text-foreground shadow-sm hover:bg-accent lg:inline-flex"
          onClick={() => onSecondaryOpenChange(!expanded)}
          aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
        >
          {expanded ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </Button>
      )}
    </aside>
  );
}

export function DualSidebarMobileTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-9 lg:hidden"
      onClick={onOpen}
      aria-label="Open navigation"
    >
      <Menu className="size-4" />
    </Button>
  );
}

export function DualSidebarExpandTrigger({
  secondaryOpen,
  onToggle,
}: {
  secondaryOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="hidden size-9 lg:inline-flex"
      onClick={onToggle}
      aria-label={secondaryOpen ? "Collapse navigation" : "Expand navigation"}
    >
      <PanelLeft className="size-4" />
    </Button>
  );
}

export function readSecondaryOpenCookie(defaultValue = true) {
  if (typeof document === "undefined") return defaultValue;
  const match = document.cookie.match(new RegExp(`(?:^|; )${SIDEBAR_COOKIE}=([^;]*)`));
  if (!match) return defaultValue;
  return match[1] === "true";
}

export function writeSecondaryOpenCookie(open: boolean) {
  document.cookie = `${SIDEBAR_COOKIE}=${open}; path=/; max-age=${60 * 60 * 24 * 30}`;
}

/** @deprecated no-op kept for import stability during refactor */
export function useSidebarDomainSync() {
  useEffect(() => {}, []);
}
