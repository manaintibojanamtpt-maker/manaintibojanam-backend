import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { getAppVersionBootstrapScript } from './scripts/app-version-bootstrap-snippet.mjs';
import { getFirebaseConfigBootstrapScript } from './scripts/firebase-config-bootstrap-snippet.mjs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = __dirname;

function resolveBuildId() {
  try {
    return (
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
      process.env.RENDER_GIT_COMMIT?.slice(0, 12) ||
      execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim()
    );
  } catch {
    return `dev-${Date.now()}`;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const appBuildId = resolveBuildId();
  const versionBootstrap = getAppVersionBootstrapScript(appBuildId);
  const apiUrl = env.VITE_API_URL || 'https://manaintibojanam-backend.onrender.com';
  const firebaseBootstrap = getFirebaseConfigBootstrapScript(apiUrl.replace(/\/$/, ''));

  return {
    define: {
      'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(appBuildId),
      // GEMINI_API_KEY is intentionally excluded from the frontend bundle for security
    },
    plugins: [
      {
        name: 'inject-app-version-bootstrap',
        transformIndexHtml(html, ctx) {
          const isMarketing = (ctx.filename || '').replace(/\\/g, '/').endsWith('/marketing.html');
          // Marketing must stay Firebase-free — no blocking config XHR in <head>.
          if (isMarketing) {
            return html
              .replace('<!--FIREBASE_CONFIG_BOOTSTRAP-->', '')
              .replace(
                '<!--APP_VERSION_BOOTSTRAP-->',
                `<script>${versionBootstrap}</script>`,
              );
          }
          return html
            .replace('<!--FIREBASE_CONFIG_BOOTSTRAP-->', `<script>${firebaseBootstrap}</script>`)
            .replace('<!--APP_VERSION_BOOTSTRAP-->', `<script>${versionBootstrap}</script>`);
        },
      },
      tailwindcss(),
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'prompt',
        injectRegister: false,
        devOptions: {
          enabled: false,
        },
        manifest: false,
        injectManifest: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,json}'],
          // Keep SW lean: skip heavy portal/admin chunks not needed for marketing first visit.
          globIgnores: [
            '**/version.json',
            '**/assets/admin-panel-*.js',
            '**/assets/checkout-*.js',
            '**/assets/my-orders-*.js',
            '**/assets/owner-shell-*.js',
            '**/assets/vendor-firebase-*.js',
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@bhojan/location-core': path.resolve(__dirname, 'packages/location-core/src/index.ts'),
        '@bhojan/location-v2': path.resolve(__dirname, 'src/features/location-v2/index.ts'),
      },
      dedupe: ['react', 'react-dom'],
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    build: {
      cssCodeSplit: true,
      target: 'es2020',
      minify: 'esbuild',
      brotliSize: false,
      chunkSizeWarningLimit: 700,
      // Strip portal/firebase deps from marketing.html modulepreload list only.
      modulePreload: {
        resolveDependencies(filename, deps) {
          const file = filename.replace(/\\/g, '/');
          const isMarketingEntry =
            file.endsWith('/marketing.html') ||
            /\/assets\/marketing-[^/]+\.js$/.test(file) ||
            file.includes('/marketing.html');
          if (!isMarketingEntry) return deps;
          return deps.filter((dep) => {
            const d = dep.replace(/\\/g, '/');
            return !(
              d.includes('owner-shell') ||
              d.includes('vendor-firebase') ||
              d.includes('vendor-capacitor') ||
              d.includes('checkout') ||
              d.includes('admin-panel') ||
              d.includes('my-orders') ||
              d.includes('appBootstrap')
            );
          });
        },
      },
      rollupOptions: {
        input: {
          main: path.resolve(root, 'index.html'),
          marketing: path.resolve(root, 'marketing.html'),
        },
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
              // Keep icons out of owner-shell — otherwise marketing imports owner-shell for Lucide.
              if (normalizedId.includes('/lucide-react/')) {
                return 'vendor-lucide';
              }
              if (normalizedId.includes('/react-dom/') || normalizedId.includes('/react/') || normalizedId.includes('/scheduler/')) {
                return 'vendor-react';
              }
            }
            if (normalizedId.includes('/src/pages/AdminPanel.tsx')) {
              return 'admin-panel';
            }
            // Shared owner shell only — keep individual owner pages as separate lazy chunks.
            if (
              normalizedId.includes('/src/components/owner/OwnerLayout') ||
              normalizedId.includes('/src/components/owner/EntitlementGate') ||
              normalizedId.includes('/src/context/DashboardRealtimeProvider') ||
              normalizedId.includes('/src/context/dashboardRealtimeHelpers') ||
              normalizedId.includes('/src/context/OrderAlertContext')
            ) {
              return 'owner-shell';
            }
            if (normalizedId.includes('/src/pages/Checkout.tsx')) {
              return 'checkout';
            }
            if (normalizedId.includes('/src/pages/MyOrders.tsx')) {
              return 'my-orders';
            }
            // MarketingApp router shell only — never force marketing components here
            // (MarketplaceHome also imports EnterpriseHeader; forced chrome ↔ owner cycles).
            if (normalizedId.includes('/src/MarketingApp.tsx')) {
              return 'marketing-core';
            }
            if (normalizedId.includes('/src/components/marketing/MarketingLandingSections')) {
              return 'marketing-sections';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      warmup: {
        clientFiles: [
          './marketing.html',
          './src/marketing-main.tsx',
          './src/marketing.css',
          './src/MarketingApp.tsx',
          './src/pages/OnboardKitchen.tsx',
          './src/components/marketing/MarketingHero.tsx',
          './src/components/marketing/EnterpriseHeader.tsx',
        ],
      },
    },
  };
});
