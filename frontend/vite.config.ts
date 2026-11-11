import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const forwardedPreviewHost = runtimeEnv.SGD_VITE_ALLOWED_HOST?.trim();

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: forwardedPreviewHost ? [forwardedPreviewHost] : [],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    clearMocks: true,
  },
});
