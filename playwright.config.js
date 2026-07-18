// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORT = process.env.CANCHERO_TEST_PORT || '4178';
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Suite E2E de Canchero.
 * Dos "proyectos": PC en horizontal (landscape) y celular en vertical (portrait).
 * Sirve el build de www/ con un server estático propio (tests/serve.js).
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: { timeout: 12000 },
  // La página es pesada (script.js ~1.7MB): pocos workers = estable, sin contención.
  fullyParallel: false,
  workers: 2,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/report' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Bloquear el service worker: su reload en controllerchange interrumpe las
    // navegaciones de test. Además hace los tests deterministas (sin caché del SW).
    serviceWorkers: 'block',
    navigationTimeout: 15000,
  },
  webServer: {
    command: 'node tests/serve.js',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
  },
  projects: [
    {
      name: 'pc-horizontal',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 }, // PC horizontal
      },
    },
    {
      name: 'celular-vertical',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 }, // celular vertical (portrait)
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
