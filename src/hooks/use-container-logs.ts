import { useEffect, useState } from "react";
import { fetchContainerLogs, type ContainerLogDump } from "@/lib/stage1-client";

const POLL_MS = 15_000;

export function useContainerLogs(
  tenantId: string,
  selected?: { namespace?: string; pod?: string },
  enabled = true,
  paused = false,
): ContainerLogDump | null {
  const [dump, setDump] = useState<ContainerLogDump | null>(null);
  const namespace = selected?.namespace ?? "";
  const pod = selected?.pod ?? "";

  useEffect(() => {
    if (!enabled || !tenantId) {
      setDump(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const next = await fetchContainerLogs(
        tenantId,
        namespace || pod ? { namespace, pod } : undefined,
      );
      if (!cancelled) setDump(next);
    };
    void load();
    if (paused) {
      return () => {
        cancelled = true;
      };
    }
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void load();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tenantId, namespace, pod, enabled, paused]);

  return dump;
}
