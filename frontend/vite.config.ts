import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Route-level React.lazy (see app/routes.tsx) splits the pages; this splits
    // the vendors those pages pull in, so a leaflet or recharts route doesn't
    // re-download React on navigation and the caches invalidate independently.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd', '@ant-design/icons'],
          charts: ['recharts'],
          maps: ['leaflet', 'react-leaflet'],
          query: ['@tanstack/react-query', 'axios', 'zustand', 'dayjs'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: ['localhost', 'navdashboard.com', 'www.navdashboard.com', 'test.navdashboard.com'],
    watch: {
      usePolling: true,
    },
    hmr: {
      // The browser dials this port for the HMR websocket, so it must match the
      // port nginx is published on — 80 for the domain, something else locally.
      clientPort: Number(process.env.VITE_HMR_CLIENT_PORT) || 80,
    },
  },
})