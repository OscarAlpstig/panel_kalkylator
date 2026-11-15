import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: 'tests', use: { baseURL: 'http://127.0.0.1:4173/panel_kalkylator/' }, webServer: { command: 'npm run preview -- --port 4173', port: 4173, reuseExistingServer: false } });
