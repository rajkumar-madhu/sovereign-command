import { useEffect, useState } from "react";
import { agents } from "@/data/seed";
import { useOps } from "@/lib/ops-context";
import type { Agent } from "@/data/types";

export type FleetPulse = {
  active: number;
  degraded: number;
  highRisk: number;
  invokesPerMin: number;
  avgTrust: number;
  updatedAt: number;
};

function baseCounts(effective: (a: Agent) => string) {
  let active = 0;
  let degraded = 0;
  let highRisk = 0;
  let trustSum = 0;
  for (const a of agents) {
    const st = effective(a);
    if (st === "active") active += 1;
    if (st === "degraded") degraded += 1;
    if (a.riskLevel === "high" || a.riskLevel === "critical") highRisk += 1;
    trustSum += a.trustScore;
  }
  return {
    active,
    degraded,
    highRisk,
    avgTrust: Math.round(trustSum / agents.length),
  };
}

/** Semi-live fleet signal for Agent Registry — ticks invoke rate without fake agent churn. */
export function useFleetPulse(enabled = true): FleetPulse {
  const ops = useOps();
  const effective = (a: Agent) => ops.agentStates[a.id] ?? a.status;
  const base = baseCounts(effective);

  const [invokesPerMin, setInvokes] = useState(420);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      setInvokes((n) => Math.max(180, Math.min(920, n + Math.round((Math.random() - 0.45) * 28))));
      setUpdatedAt(Date.now());
    }, 2000);
    return () => window.clearInterval(id);
  }, [enabled]);

  return { ...base, invokesPerMin, updatedAt };
}
