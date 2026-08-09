import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function DocsChrome({
  active,
  children,
}: {
  active: "intro" | "aegis";
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f4] text-[#1c1c1c]">
      <a
        href="#docs-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-[#e8e6e0]/bg-[#f7f7f4]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-coral text-sm font-bold text-white">
              W
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              Wecrew <em className="not-italic text-brand-coral">Ops</em>
            </span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-[#5c5a56] lg:flex" aria-label="Primary">
            <Link to="/" className="hover:text-[#1c1c1c]">
              Product
            </Link>
            <Link
              to="/docs"
              className={active === "intro" ? "font-medium text-[#1c1c1c]" : "hover:text-[#1c1c1c]"}
            >
              Intro
            </Link>
            <Link
              to="/docs/aegis"
              className={active === "aegis" ? "font-medium text-[#1c1c1c]" : "hover:text-[#1c1c1c]"}
            >
              AEGIS freeze
            </Link>
            <a href="/#security" className="hover:text-[#1c1c1c]">
              Security
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-[#1c1c1c]">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="bg-brand-coral text-white hover:bg-brand-coral/90">
              <Link to="/demo/vertical-slice">Stage-1 demo</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="docs-main">{children}</main>

      <footer className="bg-[#f7f7f4]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.2fr_2fr] md:px-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-coral text-sm font-bold text-white">
                W
              </span>
              <span className="text-[15px] font-semibold tracking-tight">
                Wecrew <em className="not-italic text-brand-coral">Ops</em>
              </span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-[#5c5a56]">
              Sovereign Autonomous Operations OS — Command Center experience for the WeCrew AEGIS™
              product family.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3" aria-label="Footer">
            <div>
              <h3 className="text-sm font-semibold text-[#1c1c1c]">Docs</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#5c5a56]">
                <li>
                  <Link to="/docs" className="hover:text-[#1c1c1c]">
                    Intro
                  </Link>
                </li>
                <li>
                  <Link to="/docs/aegis" className="hover:text-[#1c1c1c]">
                    AEGIS product freeze
                  </Link>
                </li>
                <li>
                  <Link to="/demo/vertical-slice" className="hover:text-[#1c1c1c]">
                    Stage-1 vertical slice
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1c1c1c]">Console</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#5c5a56]">
                <li>
                  <Link to="/command" className="hover:text-[#1c1c1c]">
                    Command Centre
                  </Link>
                </li>
                <li>
                  <Link to="/control-tower" className="hover:text-[#1c1c1c]">
                    AI Control Tower
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-[#1c1c1c]">
                    Sign in
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1c1c1c]">Company</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#5c5a56]">
                <li>
                  <a href="mailto:support@wecrew.in" className="hover:text-[#1c1c1c]">
                    support@wecrew.in
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
        <div className="border-t border-[#e8e6e0]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-[#5c5a56] md:px-6">
            <p>© 2026 WeCrew Technologies Private Limited · Confidential</p>
            <span className="font-mono">AEGIS™ · Sovereign Mode · self-hosted-first</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
