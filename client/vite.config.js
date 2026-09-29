import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PROXY_TARGET = 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': API_PROXY_TARGET,
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: './src/setupTests.js',
  },
});
