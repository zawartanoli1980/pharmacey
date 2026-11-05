import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: {
    baseURL: process.env.TEST_URL || "http://127.0.0.1:3000",
    headless: true,
    launchOptions: {
      ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
        : {}),
      ...(process.env.PLAYWRIGHT_NO_SANDBOX === "true"
        ? { args: ["--no-sandbox"] }
        : {}),
    },
  },
  reporter: "list",
});
