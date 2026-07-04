#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const specPath = resolve(root, 'openapi/marketplace-api.yaml');

if (!existsSync(specPath)) {
  console.error('OpenAPI spec missing:', specPath);
  process.exit(1);
}

const spec = parse(readFileSync(specPath, 'utf8'));

const requiredPaths = [
  '/api/marketplace/health',
  '/api/marketplace/discover',
  '/api/marketplace/search',
  '/api/marketplace/quote',
  '/api/marketplace/checkout/place',
  '/api/marketplace/orders/{orderId}/tracking',
];

const missing = requiredPaths.filter((path) => !spec.paths?.[path]);
if (missing.length > 0) {
  console.error('OpenAPI missing required paths:', missing.join(', '));
  process.exit(1);
}

console.log('OpenAPI marketplace spec validated:', requiredPaths.length, 'critical paths');
