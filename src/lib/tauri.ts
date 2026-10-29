/** True when running inside the Tauri webview (vs. plain `vite dev`). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
