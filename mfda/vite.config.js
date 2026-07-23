import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// @alot/mf-calc is the frozen calc engine in ../packages/mf-calc. We alias to
// its TypeScript source so there is a single source of truth (no separate build
// step) and Netlify — which builds this app from base="mfda/" — still resolves
// it because the files sit on disk relative to the repo checkout.
const mfCalc = fileURLToPath(new URL('../packages/mf-calc/src/index.ts', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@alot/mf-calc': mfCalc },
  },
  server: { port: 5175, open: true },
});
