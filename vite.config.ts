import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: '/dfk-equipment-viewer/',
  plugins: [react()],
  server: { port: 5175 },
  build: {
    rollupOptions: {
      output: {
        // The React runtime is stable across releases, so giving it a dedicated chunk keeps its content hash steady when only app code changes. Returning visitors reload just the small app chunk and serve React from cache.
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
