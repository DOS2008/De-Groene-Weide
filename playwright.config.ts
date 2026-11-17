import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the running dev stack.
 *
 *   docker compose --profile test run --rm e2e
 *
 * The tests run in the official Playwright image (service e2e in
 * compose.yaml) and reach the site at http://web:3000 and Mailpit at
 * http://mailpit:8025 over the Docker network.
 */
export default defineConfig({
  testDir: "e2e",
  // The dev server compiles each page on first visit; give it time.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grepInvert: /@phone/, testIgnore: /settings-.*\.spec\.ts/ },
    { name: "phone", use: { ...devices["Pixel 7"] }, grep: /@phone/, testIgnore: /settings-.*\.spec\.ts/ },
    // Tests that change a site-wide setting (e.g. booking level 2) run
    // last and alone, so they never disturb the other tests.
    {
      name: "settings",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /settings-.*\.spec\.ts/,
      dependencies: ["desktop", "phone"],
    },
  ],
});
