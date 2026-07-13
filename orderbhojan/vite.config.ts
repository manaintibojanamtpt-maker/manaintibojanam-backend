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
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'OrderBhojan',
        short_name: 'OrderBhojan',
        description: 'India\'s next-generation food ordering marketplace',
        theme_color: '#070504',
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
        globIgnores: ['**/hero/**', '**/categories/**', '**/brand/**'],
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
