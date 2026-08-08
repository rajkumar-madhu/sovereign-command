import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouterState } from "@tanstack/react-router";

const NAV_COOKIE = "sovereign_nav_expanded";
const FOCUS_COOKIE = "sovereign_focus_mode";

function readBoolCookie(name: string, fallback: boolean) {
  if (typeof document === "undefined") return fallback;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return fallback;
  return match[1] === "true";
}

function writeBoolCookie(name: string, value: boolean) {
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 30}`;
}

/** Detail / reading routes prefer maximized canvas.
 * Agent detail stays an operate surface (nav + Agent details inspector), not auto-focus. */
export function isDetailReadingRoute(pathname: string) {
  return (
    pathname === "/evidence" ||
    pathname === "/rca" ||
    pathname.startsWith("/incidents/") ||
    pathname.startsWith("/customers/")
  );
}

type ShellChromeValue = {
  navExpanded: boolean;
  setNavExpanded: (open: boolean) => void;
  toggleNav: () => void;
  focusMode: boolean;
  setFocusMode: (on: boolean) => void;
  toggleFocusMode: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
};

const ShellChromeContext = createContext<ShellChromeValue | null>(null);

export function ShellChromeProvider({
  children,
  onFocusModeChange,
}: {
  children: ReactNode;
  /** Sync inspector closed when entering focus mode */
  onFocusModeChange?: (focus: boolean) => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [navExpanded, setNavExpandedState] = useState(true);
  const [focusMode, setFocusModeState] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const prevPathRef = useRef(pathname);
  const onFocusModeChangeRef = useRef(onFocusModeChange);
  onFocusModeChangeRef.current = onFocusModeChange;

  useEffect(() => {
    const detail = isDetailReadingRoute(window.location.pathname);
    // Detail routes default to focus; cookie wins when user has an explicit preference
    const hasFocusCookie = document.cookie.includes(`${FOCUS_COOKIE}=`);
    const savedFocus = hasFocusCookie ? readBoolCookie(FOCUS_COOKIE, detail) : detail;
    const savedNav = readBoolCookie(NAV_COOKIE, !savedFocus);
    setFocusModeState(savedFocus);
    setNavExpandedState(savedFocus ? false : savedNav);
    if (savedFocus) onFocusModeChangeRef.current?.(true);
    setHydrated(true);
  }, []);

  // Only auto-enter focus when navigating *into* a detail route (not while staying on one)
  useEffect(() => {
    if (!hydrated) return;
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    const enteringDetail =
      isDetailReadingRoute(pathname) && !isDetailReadingRoute(prev);
    if (enteringDetail) {
      setFocusModeState(true);
      setNavExpandedState(false);
      writeBoolCookie(FOCUS_COOKIE, true);
      writeBoolCookie(NAV_COOKIE, false);
      onFocusModeChangeRef.current?.(true);
    }
  }, [pathname, hydrated]);

  const setNavExpanded = useCallback((open: boolean) => {
    setNavExpandedState(open);
    writeBoolCookie(NAV_COOKIE, open);
    if (open) {
      setFocusModeState(false);
      writeBoolCookie(FOCUS_COOKIE, false);
      onFocusModeChangeRef.current?.(false);
    }
  }, []);

  const setFocusMode = useCallback((on: boolean) => {
    setFocusModeState(on);
    writeBoolCookie(FOCUS_COOKIE, on);
    if (on) {
      setNavExpandedState(false);
      writeBoolCookie(NAV_COOKIE, false);
    } else {
      setNavExpandedState(true);
      writeBoolCookie(NAV_COOKIE, true);
    }
    onFocusModeChangeRef.current?.(on);
  }, []);

  const toggleNav = useCallback(() => {
    setNavExpanded(!navExpanded);
  }, [navExpanded, setNavExpanded]);

  const toggleFocusMode = useCallback(() => {
    setFocusMode(!focusMode);
  }, [focusMode, setFocusMode]);

  // ⌘\\ focus · ⌘[ nav · ⌘] inspector handled by consumer
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setFocusMode(!focusMode);
      }
      if (e.key === "[" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setNavExpanded(!navExpanded);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode, navExpanded, setFocusMode, setNavExpanded]);

  const value = useMemo(
    () => ({
      navExpanded,
      setNavExpanded,
      toggleNav,
      focusMode,
      setFocusMode,
      toggleFocusMode,
      mobileNavOpen,
      setMobileNavOpen,
    }),
    [
      navExpanded,
      setNavExpanded,
      toggleNav,
      focusMode,
      setFocusMode,
      toggleFocusMode,
      mobileNavOpen,
    ],
  );

  return <ShellChromeContext.Provider value={value}>{children}</ShellChromeContext.Provider>;
}

export function useShellChrome() {
  const ctx = useContext(ShellChromeContext);
  if (!ctx) throw new Error("useShellChrome must be used within ShellChromeProvider");
  return ctx;
}
