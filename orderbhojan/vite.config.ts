import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) return 'firebase';
          if (id.includes('node_modules/framer-motion')) return 'motion';
          if (id.includes('node_modules/@tanstack/react-query')) return 'query';
          if (id.includes('react-router-dom') || id.includes('node_modules/react-router')) return 'router';
          if (id.includes('node_modules/lucide-react')) return 'icons';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@bhojan/location-core': path.resolve(__dirname, '../packages/location-core/src/index.ts'),
      '@bhojan/location-v2': path.resolve(__dirname, '../src/features/location-v2'),
      '@bhojan/storefront-design-system': path.resolve(__dirname, '../src/design-system'),
      // Monorepo: BDS has its own node_modules/react — must share one instance with the app.
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, './node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, './node_modules/react/jsx-dev-runtime'),
      'react-router-dom': path.resolve(__dirname, './node_modules/react-router-dom'),
      'framer-motion': path.resolve(__dirname, './node_modules/framer-motion'),
      clsx: path.resolve(__dirname, './node_modules/clsx'),
      'tailwind-merge': path.resolve(__dirname, './node_modules/tailwind-merge'),
      'lucide-react': path.resolve(__dirname, './node_modules/lucide-react'),
    },
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  optimizeDeps: {
    // Local file: package — pre-bundling caches stale exports when BDS is rebuilt.
    exclude: ['@bhojan/storefront-design-system'],
    include: ['react-router-dom'],
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'OrderBhojan',
        short_name: 'OrderBhojan',
        description: 'India\'s next-generation food ordering marketplace',
        theme_color: '#050403',
        background_color: '#050403',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cacheId: 'orderbhojan-pwa-v7',
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2,png}'],
        globIgnores: ['**/hero/**', '**/categories/**', 'offline.html'],
        // Serve the SPA shell on navigation failures — not the dead-end offline page.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/offline\.html$/, /^\/__\/auth\//],
        // Disabled: preloadResponse often cancels on SPA navigations and spams the console.
        navigationPreload: false,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === 'image' || request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'ob-static-media',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              /\/api\/marketplace\/restaurants\/[^/]+\/menu(?:\/|$)/.test(url.pathname) &&
              !url.pathname.includes('auth') &&
              !url.pathname.includes('payment') &&
              !url.pathname.includes('order') &&
              !url.pathname.includes('checkout') &&
              !url.pathname.includes('prepare'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'ob-food-menu-api',
              expiration: { maxEntries: 48, maxAgeSeconds: 60 * 10 },
            },
          },
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              url.pathname.startsWith('/api/marketplace/') &&
              !url.pathname.includes('order') &&
              !url.pathname.includes('payment') &&
              !url.pathname.includes('auth') &&
              !url.pathname.includes('verify') &&
              !url.pathname.includes('checkout') &&
              !url.pathname.includes('prepare'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'ob-discovery-api',
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
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
      '/api/location': {
        target: process.env.VITE_MARKETPLACE_API_PROXY ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
