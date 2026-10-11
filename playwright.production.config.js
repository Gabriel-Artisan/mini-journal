import { defineConfig } from '@playwright/test';
import config from './playwright.config.js';

export default defineConfig({
  ...config,
  outputDir: './test-results/production',
  use: { ...config.use, baseURL: 'http://127.0.0.1:4174/mini-journal/' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/mini-journal/',
    reuseExistingServer: false,
  },
});
