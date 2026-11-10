import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';
if (!process.env.CI) config({ path: '.env.test', override: true, quiet: true });
if (process.env.APP_ENV !== 'test' || process.env.INSTANCE_ID !== 'dev-platform-test') throw new Error('E2E 必须使用专用测试环境');
const webPort = Number(process.env.E2E_WEB_PORT ?? 5777);
if (!Number.isInteger(webPort) || webPort < 1024 || webPort > 65535) throw new Error('E2E_WEB_PORT 无效');
const webURL = `http://127.0.0.1:${webPort}`;
process.env.APP_ORIGIN = webURL;
export default defineConfig({
  testDir: './tests/e2e', workers: 1, retries: 0,
  reporter: 'list', use: { channel: process.env.E2E_BROWSER_CHANNEL, baseURL: webURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'node dist/apps/server/src/main.js', url: 'http://127.0.0.1:4311/api/v1/health/ready', reuseExistingServer: false, timeout: 30000 },
    { command: `pnpm --filter @dev-platform/admin-web dev --host 127.0.0.1 --port ${webPort} --strictPort`, url: webURL, env: { API_PROXY_TARGET: 'http://127.0.0.1:4311' }, reuseExistingServer: false, timeout: 90000 },
  ],
});
