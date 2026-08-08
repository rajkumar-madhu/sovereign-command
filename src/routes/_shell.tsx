import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useCallback } from "react";
import { DualSidebar } from "@/components/ops/dual-sidebar";
import { RightInspector } from "@/components/ops/right-inspector";
import { TopBar } from "@/components/ops/top-bar";
import { InspectorProvider, useInspector } from "@/lib/inspector-context";
import { OpsProvider } from "@/lib/ops-context";
import { ThemeProvider } from "@/lib/theme";
import { ShellChromeProvider, useShellChrome } from "@/lib/shell-chrome";
import { useApprovalEscalationEngine, useApprovalSlaAlerts } from "@/lib/use-approval-sla";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  return (
    <ThemeProvider>
      <OpsProvider>
        <InspectorProvider>
          <ShellWithFocusSync />
        </InspectorProvider>
      </OpsProvider>
    </ThemeProvider>
  );
}

function ShellWithFocusSync() {
  const { setOpen: setInspectorOpen } = useInspector();

  const onFocusModeChange = useCallback(
    (focus: boolean) => {
      if (focus) setInspectorOpen(false);
    },
    [setInspectorOpen],
  );

  return (
    <ShellChromeProvider onFocusModeChange={onFocusModeChange}>
      <ApprovalSlaWatcher />
      <ShellChrome />
    </ShellChromeProvider>
  );
}

function ShellChrome() {
  const { navExpanded, setNavExpanded, mobileNavOpen, setMobileNavOpen, focusMode } =
    useShellChrome();

  // Focus mode: icon-only left rail + inspector closed (via onFocusModeChange)
  const leftExpanded = focusMode ? false : navExpanded;

  return (
    <div className="flex min-h-screen w-full bg-transparent">
      <DualSidebar
        secondaryOpen={leftExpanded}
        onSecondaryOpenChange={(open) => {
          if (open) {
            // Expanding nav exits focus mode
            setNavExpanded(true);
          } else {
            setNavExpanded(false);
          }
        }}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
        focusHidden={focusMode}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          secondaryOpen={leftExpanded}
          onToggleSecondary={() => setNavExpanded(!leftExpanded)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main
          className={cn(
            "w-full flex-1 space-y-6 py-5 animate-rise-in",
            focusMode ? "mx-0 max-w-none px-4 md:px-8 lg:px-10" : "mx-auto max-w-[1600px] px-3 md:px-6",
          )}
        >
          <Outlet />
        </main>
      </div>
      <RightInspector />
    </div>
  );
}

function ApprovalSlaWatcher() {
  useApprovalSlaAlerts();
  useApprovalEscalationEngine();
  return null;
}
