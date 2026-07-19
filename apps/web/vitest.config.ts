import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

process.env.VITE_SUPABASE_URL ??= "http://localhost:54321";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??= "test-publishable-key";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "happy-dom",
      include: ["src/**/*.test.{ts,tsx}"],
    },
  }),
);
