import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173/carte-carburants/',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  },
  // Suppose `npm run build:data` déjà exécuté (données dans public/data).
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/carte-carburants/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
