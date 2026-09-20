import { useEffect, useState } from "react";
import { fetchClusterSnapshot, type ClusterSnapshot } from "@/lib/stage1-client";

const POLL_MS = 15_000;

export function useClusterSnapshot(tenantId: string, enabled = true): ClusterSnapshot | null {
  const [snapshot, setSnapshot] = useState<ClusterSnapshot | null>(null);

  useEffect(() => {
    if (!enabled || !tenantId) {
      setSnapshot(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const next = await fetchClusterSnapshot(tenantId);
      if (!cancelled) setSnapshot(next);
    };
    void load();
    const id = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [tenantId, enabled]);

  return snapshot;
}
