import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for DebtOS.
 *
 * Tests run against the production static export (the exact bundle that ships
 * inside the Capacitor Android shell), served as static files — so the web E2E
 * exercises the same assets the native app loads in its WebView.
 *
 * Run `pnpm build` first (or rely on the webServer command below, which serves
 * whatever is already in `out/`).
 */
const PORT = 4321;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      // Pixel-class viewport so web E2E mirrors the native emulator target.
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `python3 -m http.server ${PORT} --directory out`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
