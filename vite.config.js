import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  publicDir: 'public',
  build: { outDir: '../dist', emptyOutDir: true },
  server: {
    // Polling: file changes made from Windows on /mnt/c are not seen by WSL otherwise.
    watch: { usePolling: true, interval: 300 },
  },
});
