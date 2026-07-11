/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'es2020',
  },
  test: {
    // Regras puras do domínio rodam sem DOM nem Phaser (Constitution IX).
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
