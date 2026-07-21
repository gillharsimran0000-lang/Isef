import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The frontend imports the simulation engine's TypeScript source directly.
      // One implementation of the science, compiled once by Vite; so a number on
      // a chart and a number from the API can never drift apart.
      '@pilengine/simulation-engine': fileURLToPath(
        new URL('../simulation-engine/src/index.ts', import.meta.url),
      ),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: 5173, host: true },
});
