import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    proxy: {
      '/api/datagolf': {
        target: 'https://feeds.datagolf.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/datagolf/, ''),
      },
    },
  },
});
