import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ops/app-sidebar";
import { TopBar } from "@/components/ops/top-bar";
import { OpsProvider } from "@/lib/ops-context";
import { useApprovalSlaAlerts } from "@/lib/use-approval-sla";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  return (
    <OpsProvider>
      <SidebarProvider>
        <ApprovalSlaWatcher />
        <div className="flex min-h-screen w-full bg-surface">
          <AppSidebar />
          <SidebarInset className="min-w-0 bg-surface">
            <TopBar />
            <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-6 px-3 py-5 md:px-6">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </OpsProvider>
  );
}

/** Mounted inside OpsProvider so approval SLA thresholds page approvers in real time. */
function ApprovalSlaWatcher() {
  useApprovalSlaAlerts();
  return null;
}