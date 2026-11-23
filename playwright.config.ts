import { defineConfig } from "@playwright/test";
import { apiPort, devOrigin, devPort, passkeyOrigin, previewOrigin, previewPort } from "./tests/e2e/urls";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    ...(process.env.PLAYWRIGHT_CHROME === "1" && { channel: "chrome" as const }),
    baseURL: devOrigin,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run server",
      url: "http://127.0.0.1:" + apiPort + "/api/health",
      env: { PORT: apiPort, APP_ORIGIN: passkeyOrigin, APP_ORIGINS: devOrigin + "," + previewOrigin },
      timeout: 60000,
    },
    {
      command: "npm run dev -- --port " + devPort,
      url: devOrigin,
      env: { MOBYWATEL_API_PORT: apiPort },
      timeout: 60000,
    },
    {
      command: "npm run preview -- --port " + previewPort,
      url: previewOrigin,
      env: { MOBYWATEL_API_PORT: apiPort },
      timeout: 60000,
    },
  ],
});
