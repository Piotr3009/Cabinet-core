import { execSync } from 'node:child_process';
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
  // The owner, 16.08: "numer pusha po kolei dawaj, nie tylko datę" — #N is
  // the commit count (monotonic with every push), the 7-char SHA pins the
  // exact one. On a shallow clone the count would lie, so it is dropped
  // rather than shown wrong; the SHA and the date always stand.
  define: {
    __BUILD_STAMP__: JSON.stringify((() => {
      const when = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
      let sha = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7);
      let count = '';
      try {
        if (!sha) sha = execSync('git rev-parse --short HEAD').toString().trim();
        const shallow = execSync('git rev-parse --is-shallow-repository').toString().trim();
        if (shallow !== 'true') {
          count = `#${execSync('git rev-list --count HEAD').toString().trim()} · `;
        }
      } catch { /* not a git checkout — date (+sha from env) is enough */ }
      return `${count}${when}${sha ? ` · ${sha}` : ''}`;
    })()),
  },
});
