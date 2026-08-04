import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cabinet Core — static frontend (Vercel), no backend of its own.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { outDir: 'dist', sourcemap: true },
});
