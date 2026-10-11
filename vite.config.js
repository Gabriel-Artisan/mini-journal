import { defineConfig } from 'vite';
import { offlinePlugin } from './scripts/offline-plugin.js';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/mini-journal/' : '/',
  plugins: [offlinePlugin()],
}));
