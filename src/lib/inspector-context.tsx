import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const INSPECTOR_COOKIE = "sovereign_inspector_open";

type InspectorContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;
  focusAgent: (id: string) => void;
};

const InspectorContext = createContext<InspectorContextValue | null>(null);

function readInspectorCookie(defaultValue = false) {
  if (typeof document === "undefined") return defaultValue;
  const match = document.cookie.match(new RegExp(`(?:^|; )${INSPECTOR_COOKIE}=([^;]*)`));
  if (!match) return defaultValue;
  return match[1] === "true";
}

function writeInspectorCookie(open: boolean) {
  document.cookie = `${INSPECTOR_COOKIE}=${open}; path=/; max-age=${60 * 60 * 24 * 30}`;
}

export function InspectorProvider({ children }: { children: ReactNode }) {
  // Closed by default — panel is opt-in so the main canvas keeps width
  const [open, setOpenState] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  useEffect(() => {
    // Restore only an explicit "left open" preference — never force-close after
    // route handlers (e.g. agent detail) auto-open the panel on mount.
    if (readInspectorCookie(false)) setOpenState(true);
  }, []);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    writeInspectorCookie(next);
  }, []);

  const toggle = useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  const focusAgent = useCallback(
    (id: string) => {
      setSelectedAgentId(id);
      setOpen(true);
    },
    [setOpen],
  );

  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggle,
      selectedAgentId,
      setSelectedAgentId,
      focusAgent,
    }),
    [open, setOpen, toggle, selectedAgentId, focusAgent],
  );

  return <InspectorContext.Provider value={value}>{children}</InspectorContext.Provider>;
}

export function useInspector() {
  const ctx = useContext(InspectorContext);
  if (!ctx) throw new Error("useInspector must be used within InspectorProvider");
  return ctx;
}
