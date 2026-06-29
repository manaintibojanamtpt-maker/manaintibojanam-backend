import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { getAppVersionBootstrapScript } from './scripts/app-version-bootstrap-snippet.mjs';
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

  return {
    define: {
      'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(appBuildId),
      // GEMINI_API_KEY is intentionally excluded from the frontend bundle for security
    },
    plugins: [
      {
        name: 'inject-app-version-bootstrap',
        transformIndexHtml(html) {
          return html.replace('<!--APP_VERSION_BOOTSTRAP-->', `<script>${versionBootstrap}</script>`);
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
          globIgnores: ['**/version.json'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    build: {
      cssCodeSplit: true,
      modulePreload: true,  // Re-enabled: allows browser to prefetch lazy chunks
      target: 'es2020',
      minify: 'esbuild',
      brotliSize: false,
      chunkSizeWarningLimit: 700,
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
              if (normalizedId.includes('/react-dom/') || normalizedId.includes('/react/') || normalizedId.includes('/scheduler/')) {
                return 'vendor-react';
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
            if (
              normalizedId.includes('/src/MarketingApp.tsx') ||
              normalizedId.includes('/src/pages/OnboardKitchen.tsx') ||
              normalizedId.includes('/src/pages/marketing/') ||
              (normalizedId.includes('/src/components/marketing/') &&
                !normalizedId.includes('MarketingLandingSections')) ||
              normalizedId.includes('/src/components/EnterpriseFooter.tsx') ||
              normalizedId.includes('/src/components/EnterpriseSchema.tsx') ||
              normalizedId.includes('/src/hooks/useMarketingHashScroll.ts') ||
              normalizedId.includes('/src/utils/haptics.ts') ||
              normalizedId.includes('/src/config/landing.ts') ||
              normalizedId.includes('/src/config/pricing.ts')
            ) {
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
