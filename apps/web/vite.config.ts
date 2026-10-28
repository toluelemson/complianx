import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxyTarget =
  process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@complianx/contracts': path.resolve(
        __dirname,
        '../../packages/contracts/src',
      ),
    },
  },
});
