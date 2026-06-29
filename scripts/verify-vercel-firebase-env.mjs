/**
 * Fail Vercel production builds when Firebase client env points at the wrong project.
 * Missing env is allowed — runtime bootstrap loads /api/client-config or /api/health?webClient=1.
 */
const isVercelProd =
  process.env.VERCEL === '1' &&
  (process.env.VERCEL_ENV === 'production' || process.env.VITE_APP_ENV === 'production');

const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim();
const apiKey = process.env.VITE_FIREBASE_API_KEY?.trim();

if (isVercelProd && projectId === 'bhojanos2') {
  console.error('\n[build] BLOCKED: VITE_FIREBASE_PROJECT_ID must not be bhojanos2 on production.\n');
  process.exit(1);
}

if (isVercelProd && projectId && projectId !== 'bhojanos-prod') {
  console.error(
    `\n[build] BLOCKED: VITE_FIREBASE_PROJECT_ID must be bhojanos-prod (got ${projectId}).\n`,
  );
  process.exit(1);
}

if (isVercelProd && projectId === 'bhojanos-prod' && apiKey) {
  console.log('[build] Firebase env OK: bhojanos-prod (build-time)');
} else if (isVercelProd) {
  console.warn(
    '[build] VITE_FIREBASE_* not set on Vercel — frontend will load Firebase config at runtime from Render API.',
  );
} else {
  console.log(`[build] Firebase env: ${projectId || 'local/dev fallback + runtime bootstrap'}`);
}
