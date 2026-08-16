import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cabinet Core — static frontend (Vercel), no backend of its own.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { outDir: 'dist', sourcemap: true },
  // CHAT-FIX 16.08 (owner): the BUILD STAMP. One afternoon was spent arguing
  // with a browser about WHICH deploy it was showing — never again. Vite
  // burns the build moment into the bundle; App.jsx wears it in the corner
  // and says it once in the console. `dev` when running un-built.
  define: {
    __BUILD_STAMP__: JSON.stringify(
      new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    ),
  },
});
