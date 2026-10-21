import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests: a real browser clicks through the production build.
 * Run `npm run build` first, then `npm run test:e2e`.
 */
const port = 3100;
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH; // optional: use an already-installed Chromium
// Optional: test in a browser that's already installed instead of downloading one,
// e.g. PLAYWRIGHT_CHANNEL=msedge (Edge comes with Windows) or PLAYWRIGHT_CHANNEL=chrome.
const channel = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    // Dates in the app are shown in India time; test from there too.
    timezoneId: "Asia/Kolkata",
    trace: "on-first-retry",
    ...(channel ? { channel } : {}),
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next start --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
