import { useEffect, useState } from "react";
import { fetchContainerLogs, type ContainerLogDump } from "@/lib/stage1-client";

const POLL_MS = 15_000;

export function useContainerLogs(
  tenantId: string,
  selected?: { namespace?: string; pod?: string },
  enabled = true,
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
    const id = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [tenantId, namespace, pod, enabled]);

  return dump;
}
