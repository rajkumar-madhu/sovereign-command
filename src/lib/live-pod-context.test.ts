import { describe, expect, test } from "bun:test";
import {
  formatPodContextHeader,
  mergeResourceIdentity,
  parseLivePodStatus,
  restartCount,
} from "./live-pod-context";

describe("live-pod-context", () => {
  test("parses enriched pod status from evidence body", () => {
    const pod = parseLivePodStatus(
      JSON.stringify({
        name: "payments-auth-7d9f8c6b4-xq2n1",
        tenantId: "tn-nordic",
        customerId: "cu-fsprod",
        application: "payments-auth",
        cluster: "kind-wecrew",
        namespace: "tn-nordic",
        nodeName: "wecrew-control-plane",
        hostIP: "172.16.2.2",
        podIP: "10.244.0.170",
        containerStatuses: [{ ready: false, restartCount: 516, state: { waiting: { reason: "CrashLoopBackOff" } } }],
      }),
    );
    expect(pod?.cluster).toBe("kind-wecrew");
    expect(restartCount(pod!)).toBe(516);
  });

  test("merges live fields over seed resource identity", () => {
    const merged = mergeResourceIdentity(
      {
        application: "payments-auth",
        cluster: "fs-prod-k8s",
        namespace: "payments",
        hostname: "pay-auth-a3.payments.corp",
      },
      parseLivePodStatus(
        JSON.stringify({
          name: "payments-auth-7d9f8c6b4-xq2n1",
          tenantId: "tn-nordic",
          cluster: "kind-wecrew",
          namespace: "tn-nordic",
          nodeName: "wecrew-control-plane",
          podIP: "10.244.0.170",
        }),
      ),
    );
    expect(merged?.cluster).toBe("kind-wecrew");
    expect(merged?.nodeName).toBe("wecrew-control-plane");
    expect(merged?.hostname).toBe("wecrew-control-plane");
  });

  test("formats identity header for logs panel", () => {
    const header = formatPodContextHeader({
      name: "payments-auth-7d9f8c6b4-xq2n1",
      tenantId: "tn-nordic",
      customerId: "cu-fsprod",
      application: "payments-auth",
      phase: "Running",
      namespace: "tn-nordic",
      cluster: "kind-wecrew",
      nodeName: "wecrew-control-plane",
      containerStatuses: [{ ready: false, restartCount: 14, state: { waiting: { reason: "CrashLoopBackOff" } } }],
    });
    expect(header).toContain("application: payments-auth");
    expect(header).toContain("cluster:     kind-wecrew");
    expect(header).toContain("CrashLoopBackOff");
  });
});
