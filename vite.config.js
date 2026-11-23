import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'client',
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'client/index.html'),
        tracker: resolve(import.meta.dirname, 'client/tracker.html'),
      },
    },
  },
  server: {
    // Polling: file changes made from Windows on /mnt/c are not seen by WSL otherwise.
    watch: { usePolling: true, interval: 300 },
  },
});
