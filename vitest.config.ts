import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // The calendar-date helpers only misbehave in a timezone offset from UTC
    // (see src/lib/date.ts), so the suite pins an Eastern European one rather
    // than inheriting whatever the machine or CI happens to run in.
    env: { TZ: "Europe/Vilnius" },
  },
});
