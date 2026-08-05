// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Production default: Node server (Docker / K8s / bare metal).
// Cloudflare: NITRO_PRESET=cloudflare-module bun run build
const nitroPreset = process.env.NITRO_PRESET || "node-server";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  nitro: {
    preset: nitroPreset,
    // Compress static assets in production output where supported
    compressPublicAssets: true,
  },
  vite: {
    build: {
      // Smaller, deterministic production chunks
      sourcemap: process.env.SOURCEMAP === "true",
      target: "es2022",
      cssMinify: true,
      reportCompressedSize: true,
    },
  },
});
