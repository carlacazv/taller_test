import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/browser/specs",
  testMatch: /.*\.spec\.js/,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  failOnFlakyTests: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 20_000,
  expect: {
    timeout: 5_000
  },
  outputDir: "test-results/playwright",
  reporter: [["list"]],
  use: {
    baseURL,
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "node src/server.js",
        url: `${baseURL}/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 15_000
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
