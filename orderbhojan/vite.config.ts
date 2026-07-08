import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Monorepo: BDS has its own node_modules/react — must share one instance with the app.
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, './node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, './node_modules/react/jsx-dev-runtime'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // Local file: package — pre-bundling caches stale exports when BDS is rebuilt.
    exclude: ['@bhojan/design-system'],
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'OrderBhojan',
        short_name: 'OrderBhojan',
        description: 'India\'s next-generation food ordering marketplace',
        theme_color: '#ff7a00',
        background_color: '#070504',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
      },
    }),
  ],
  server: {
    port: 5174,
    host: true,
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api/marketplace': {
        target: process.env.VITE_MARKETPLACE_API_PROXY ?? 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/create-razorpay-order': {
        target: process.env.VITE_MARKETPLACE_API_PROXY ?? 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/verify-razorpay-payment': {
        target: process.env.VITE_MARKETPLACE_API_PROXY ?? 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/server-time': {
        target: process.env.VITE_MARKETPLACE_API_PROXY ?? 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/health': {
        target: process.env.VITE_MARKETPLACE_API_PROXY ?? 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/client-config': {
        target: process.env.VITE_MARKETPLACE_API_PROXY ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
