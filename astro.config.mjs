// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://frostdev.io',
  output: 'static',
  compressHTML: true,
  build: { assets: '_site' },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.endsWith('/three/build/three.core.js')) return 'three-core';
            if (id.endsWith('/three/build/three.module.js')) return 'three-renderer';
          },
        },
      },
    },
  },
});
