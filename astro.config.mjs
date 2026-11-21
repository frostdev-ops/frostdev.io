// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://frostdev.io',
  output: 'static',
  compressHTML: true,
  build: { assets: '_site' },
  // The launcher's Community tab linked /kiln/docs (0.2.0-dev.30 and older); the docs are the wiki.
  redirects: { '/kiln/docs': '/kiln/wiki' },
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
