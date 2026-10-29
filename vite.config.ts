import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";



// https://vite.dev/config/
export default defineConfig(() => ({
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [
    // `src/lib/pdf` renders inside a Web Worker. The React plugin injects a dev-only Fast Refresh
    // runtime that references `window`; in a worker that throws at load, so `Comlink.expose` never
    // runs and every export promise hangs. Vite's own esbuild pass still compiles the JSX there.
    react({ exclude: [/\/node_modules\//, /\/lib\/pdf\//] }),
    tailwindcss(),
  ],

  // Prevent Vite from obscuring rust errors
  clearScreen: false,

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  envPrefix: "VITE_",

  // Single source of truth for the version shown in the UI: package.json, which npm
  // exports to every script (dev, build, tauri). No hand-maintained copy to drift.
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "dev"),
  },

  server: { port: 5173, strictPort: true, host: "127.0.0.1" },
  preview: { port: 4173, strictPort: true, host: "127.0.0.1" },
}));
