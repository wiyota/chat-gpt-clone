import { defineConfig, devices } from "@playwright/test";

const isAct = !!process.env.ACT;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @chat/server dev",
      url: "http://localhost:3000/health",
      reuseExistingServer: !process.env.CI || isAct,
      timeout: 180 * 1000,
    },
    {
      command: "pnpm --filter @chat/web dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI || isAct,
      timeout: 180 * 1000,
    },
  ],
});
