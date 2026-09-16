import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type VisualMode = "system" | "topology" | "blueprint";

type VisualModeContextValue = {
  mode: VisualMode;
  setMode: (mode: VisualMode) => void;
};

const VisualModeContext = createContext<VisualModeContextValue | null>(null);
const STORAGE_KEY = "sovereign-visual-mode";

const LABELS: Record<VisualMode, string> = {
  system: "System",
  topology: "Topology",
  blueprint: "Blueprint",
};

function applyVisualMode(mode: VisualMode) {
  document.documentElement.setAttribute("data-visual-mode", mode);
}

export function VisualModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<VisualMode>("system");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as VisualMode | null;
    const preferred =
      stored === "system" || stored === "topology" || stored === "blueprint" ? stored : "system";
    setModeState(preferred);
    applyVisualMode(preferred);
  }, []);

  const setMode = useCallback((next: VisualMode) => {
    setModeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyVisualMode(next);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return <VisualModeContext.Provider value={value}>{children}</VisualModeContext.Provider>;
}

export function useVisualMode() {
  const ctx = useContext(VisualModeContext);
  if (!ctx) throw new Error("useVisualMode must be used within VisualModeProvider");
  return ctx;
}

export function VisualModeSwitch({ className }: { className?: string }) {
  const { mode, setMode } = useVisualMode();
  const modes: VisualMode[] = ["system", "topology", "blueprint"];

  return (
    <div
      role="group"
      aria-label="Visual mode"
      className={
        className ??
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-surface px-0.5 py-0.5"
      }
    >
      <span className="hidden px-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground sm:inline">
        View
      </span>
      {modes.map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => setMode(m)}
          className={
            mode === m
              ? "rounded px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] bg-primary/15 text-primary"
              : "rounded px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground"
          }
        >
          {LABELS[m]}
        </button>
      ))}
    </div>
  );
}
