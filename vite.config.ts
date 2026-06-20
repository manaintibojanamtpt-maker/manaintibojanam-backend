import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      tailwindcss(), 
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'prompt', // Wait for the user to explicitly accept the update
        injectRegister: 'auto',
        devOptions: {
          enabled: false // Disable in dev to prevent caching issues while coding
        },
        manifest: false, // We already have a public/manifest.json, no need to auto-generate
        injectManifest: {
          // Increase limit to 5MB to avoid warnings for large chunks if any
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // We only want to inject hashed assets. Avoid double-caching static assets handled differently if needed, 
          // but usually workbox handles all static assets in the build folder perfectly.
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,json}']
        }
      })
    ],
    define: {
      // GEMINI_API_KEY is intentionally excluded from the frontend bundle for security
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      cssCodeSplit: false,
      modulePreload: false,
      target: 'es2020',
      minify: 'esbuild',
      brotliSize: false,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');
            if (normalizedId.includes('node_modules')) {
              if (normalizedId.includes('/firebase/') || normalizedId.includes('/@firebase/')) {
                return 'vendor-firebase';
              }
              if (normalizedId.includes('/framer-motion/')) {
                return 'vendor-motion';
              }
            }
            if (normalizedId.includes('/src/pages/AdminPanel.tsx')) {
              return 'admin-panel';
            }
            if (normalizedId.includes('/src/pages/Checkout.tsx')) {
              return 'checkout';
            }
            if (normalizedId.includes('/src/pages/MyOrders.tsx')) {
              return 'my-orders';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
