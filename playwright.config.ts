import { defineConfig, devices } from '@playwright/test';

const databaseUrl = process.env.E2E_DATABASE_URL;

if (!databaseUrl?.includes('_test')) {
  throw new Error(
    'E2E_DATABASE_URL must point to a dedicated database whose name includes "_test".',
  );
}

const frontendUrl = 'http://127.0.0.1:4173';
const apiUrl = 'http://127.0.0.1:3334';
const reuseE2eServers = process.env.E2E_REUSE_SERVERS === 'true';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // These journeys share an authenticated fixture and mutate the same workspace.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html'], ['github']] : 'list',
  use: {
    baseURL: frontendUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'test-results/.auth/e2e-user.json',
      },
    },
  ],
  globalSetup: './e2e/global-setup.ts',
  webServer: [
    {
      command:
        'cd apps/api && node -r ts-node/register -r tsconfig-paths/register src/main.ts',
      url: `${apiUrl}/api/health`,
      reuseExistingServer: reuseE2eServers,
      timeout: 120_000,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        PORT: '3334',
        FRONTEND_URL: frontendUrl,
        CORS_ORIGINS: frontendUrl,
        MONETIZATION_ENABLED: 'false',
        FILE_SCANNER_PROVIDER: 'noop',
        STORAGE_ROOT: '/tmp/neuraldocx-e2e-storage',
        SMTP_HOST: '',
        SMTP_PORT: '',
        SMTP_USER: '',
        SMTP_PASS: '',
        SMTP_FROM: '',
        EMAIL_FROM: '',
        RATE_LIMIT_REQUESTS: '1000',
      },
    },
    {
      command: 'cd apps/web && ./node_modules/.bin/vite --host 127.0.0.1 --port 4173',
      url: frontendUrl,
      reuseExistingServer: reuseE2eServers,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_API_URL: '',
        VITE_API_PROXY_TARGET: apiUrl,
      },
    },
  ],
});
