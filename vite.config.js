import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Relative asset paths so the built WebUI works from whatever path qBittorrent
  // mounts it at (the "Use alternative Web UI" feature). Mirrors the old CRA
  // `homepage: "."` behaviour.
  base: './',

  plugins: [react()],

  // Expose the package version to the UI (the opt-in version-update check reads
  // it as import.meta.env.VITE_APP_VERSION). Skipped in test mode so specs can
  // override it with vi.stubEnv('VITE_APP_VERSION', ...).
  define:
    mode === 'test'
      ? {}
      : { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version) },

  build: {
    // The release packaging script and CI both consume build/public.
    outDir: 'build/public',
    emptyOutDir: true,
  },

  server: {
    port: 3000,
    // Proxy live qBittorrent API calls during local dev. Point QBIT_URL at a
    // running qBittorrent (defaults to the usual WebUI port). Without a reachable
    // backend the UI falls back to built-in preview/sample data.
    proxy: {
      '/api': {
        target: process.env.QBIT_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    css: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
}));
