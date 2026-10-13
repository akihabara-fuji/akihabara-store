// Konfigurasi tes browser. Jalankan: npm run test:e2e  (server lokal otomatis dinyalakan)
const { defineConfig } = require("@playwright/test");
const PORT = process.env.TEST_PORT || 3298;
module.exports = defineConfig({
  testDir: "./tests",
  outputDir: "./test-artifacts/results",
  reporter: [["list"], ["html", { outputFolder: "test-artifacts/report", open: "never" }]],
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: "node server.js",
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
    env: { PORT: String(PORT), ADMIN_PASSWORD: "tes-lokal-1234567", SECURE_COOKIE: "false" },
  },
});
