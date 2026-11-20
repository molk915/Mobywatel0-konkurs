import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4183",
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run server",
      url: "http://127.0.0.1:4190/api/health",
      reuseExistingServer: true,
      timeout: 60000,
    },
    {
      command: "npm run dev -- --port 4183",
      url: "http://127.0.0.1:4183",
      reuseExistingServer: true,
      timeout: 60000,
    },
    {
      command: "npm run preview -- --port 4184",
      url: "http://127.0.0.1:4184",
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
});
