import { defineConfig } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3100)
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Chromium resmi tidak diunduh di CI lokal; pakai Chrome terpasang di mesin.
    channel: 'chrome',
  },
  projects: [{ name: 'chrome' }],
  // Bereskan baris E2E (donasi + transaksi) setiap run — test donasi memakai
  // endpoint publik sehingga tidak bisa menghapus datanya sendiri lewat UI.
  globalTeardown: './tests/e2e/global-teardown.ts',
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
