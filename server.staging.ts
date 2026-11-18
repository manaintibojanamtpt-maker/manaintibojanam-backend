/**
 * BhojanOS Staging Dedicated API Server
 *
 * Minimal, isolated staging runtime providing:
 * - GET /api/health
 * - GET / (API status)
 * - 5 Read-Only Voice Agent Restaurant Discovery Endpoints:
 *     1. GET /api/voice-agent/tools/get_restaurant_profile
 *     2. GET /api/voice-agent/tools/get_restaurant_timings
 *     3. GET /api/voice-agent/tools/get_menu
 *     4. GET /api/voice-agent/tools/search_restaurants
 *     5. GET /api/voice-agent/tools/check_delivery_serviceability
 *
 * Excludes all unrelated runtime systems:
 * - No Swiggy MCP / OAuth / commerce routes
 * - No Sarvam Token Factory routes
 * - No private order-status tracking
 * - No mutating catering or callback operations
 * - No production Firebase credentials required
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { registerVoiceAgentToolsRoutes } from './backend-lib/voice/voiceAgentTools.js';

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// Staging CORS Configuration
const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const defaultOrigins = [
  'https://staging.bhojanos.com',
  'https://staging.orderbhojan.web.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

const allowedOriginsSet = new Set([...configuredOrigins, ...defaultOrigins]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOriginsSet.has(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Allow in staging
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Correlation-Id',
      'X-Requested-With',
      'x-voice-signature',
      'x-voice-timestamp',
      'x-voice-nonce',
      'x-tenant-id',
    ],
  })
);

// Raw body buffer capture for webhook HMAC signatures
app.use(
  bodyParser.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Root Status
app.get('/', (_req, res) => {
  res.json({
    service: 'bhojanos-staging-api',
    status: 'running',
    env: process.env.NODE_ENV || 'staging',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      tools: [
        '/api/voice-agent/tools/get_restaurant_profile',
        '/api/voice-agent/tools/get_restaurant_timings',
        '/api/voice-agent/tools/get_menu',
        '/api/voice-agent/tools/search_restaurants',
        '/api/voice-agent/tools/check_delivery_serviceability',
      ],
    },
  });
});

// Health Check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'staging',
    service: 'bhojanos-staging-api',
    tools: [
      'get_restaurant_profile',
      'get_restaurant_timings',
      'get_menu',
      'search_restaurants',
      'check_delivery_serviceability',
    ],
  });
});

// Register ONLY the 5 Read-Only Voice Agent Tools
registerVoiceAgentToolsRoutes(app, {
  toolSecret: process.env.VOICE_AGENT_TOOL_SECRET,
  enforceSecret: true,
  allowInMemoryTesting: true,
  readOnlyOnly: true,
  toolAllowlist: [
    'get_restaurant_profile',
    'get_restaurant_timings',
    'get_menu',
    'search_restaurants',
    'check_delivery_serviceability',
  ],
});

// 404 Handler for unregistered routes
app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Endpoint not found on BhojanOS Staging API.',
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[bhojanos-staging-api] Listening on port ${PORT} (env: ${process.env.NODE_ENV || 'staging'})`);
});

export default app;
