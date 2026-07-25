#!/usr/bin/env node
/**
 * Static safety checks for BhojanOS shared AI platform defaults.
 * Fails if client/server AI surfaces are accidentally enabled by default,
 * if OpenRouter keys appear in client bundles sources, or if auto-promote is enabled.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

console.log('=== AI platform default / safety verification ===\n');

const obFlags = read('orderbhojan/src/featureFlags/flags.ts');
for (const key of [
  'FF_OB_AI_ASSISTANT',
  'FF_OB_AI_VOICE',
  'FF_OB_AI_VOICE_TTS',
  'FF_OB_AI_POST_ORDER',
  'FF_OB_AI_PERSONALIZATION',
  'FF_OB_AI_CANARY_HEADERS',
]) {
  assert(
    new RegExp(`${key}:\\s*false`).test(obFlags),
    `OrderBhojan default ${key}=false`,
  );
}

const features = read('src/config/features.ts');
assert(/aiMarketingAssistant:\s*false/.test(features), 'Marketing aiMarketingAssistant default false');

const gateway = read('backend-lib/ai/aiGatewayConfig.ts');
assert(
  /AI_GATEWAY_ENABLED\s*===\s*'true'/.test(gateway),
  'Gateway requires explicit AI_GATEWAY_ENABLED=true',
);

const contracts = read('backend-lib/ai/rollout/aiRolloutContracts.ts');
assert(/autoPromote:\s*false/.test(contracts), 'Rollout contracts declare autoPromote false');

const canaryConfig = read('backend-lib/ai/rollout/aiRolloutConfig.ts');
assert(
  /AI_CANARY_ROLLOUT_ENABLED\s*===\s*'true'/.test(canaryConfig),
  'Canary requires explicit AI_CANARY_ROLLOUT_ENABLED=true',
);
assert(
  /AI_CANARY_WIRED_INTO_ASSIST\s*===\s*'true'/.test(canaryConfig),
  'Canary assist wire requires explicit AI_CANARY_WIRED_INTO_ASSIST=true',
);
assert(
  /AI_CANARY_LIVE_ROLLOUT_GATES_ENABLED\s*===\s*'true'/.test(canaryConfig),
  'Live rollout gates require explicit AI_CANARY_LIVE_ROLLOUT_GATES_ENABLED=true',
);

const secretPatterns = [/OPENROUTER_API_KEY/, /sk-or-v1-/];
const clientFiles = [
  'orderbhojan/src/features/assistant/infrastructure/assistantApiClient.ts',
  'orderbhojan/src/features/assistant/infrastructure/voiceSpeechCapture.ts',
  'orderbhojan/src/features/assistant/infrastructure/voiceSpeechSynthesis.ts',
  'orderbhojan/src/features/assistant/application/runConsumerAssist.ts',
  'src/features/assistant/infrastructure/assistantApiClient.ts',
  'src/features/assistant/application/runMarketingAssist.ts',
  'src/lib/opsHealthApi.ts',
  'src/components/ops/AiOpsPanel.tsx',
  'src/components/ops/AiAuditReviewPanel.tsx',
  'src/components/ops/AiShadowTrafficPanel.tsx',
];
for (const file of clientFiles) {
  const abs = resolve(root, file);
  if (!existsSync(abs)) continue;
  const body = read(file);
  for (const pattern of secretPatterns) {
    assert(!pattern.test(body), `${file} must not embed OpenRouter secrets (${pattern})`);
  }
}

const envExampleRoot = existsSync(resolve(root, '.env.example')) ? read('.env.example') : '';
if (envExampleRoot) {
  assert(
    !/^\s*VITE_FF_AI_MARKETING_ASSISTANT\s*=\s*true/m.test(envExampleRoot),
    '.env.example does not enable marketing AI by default',
  );
}

const envExampleOb = existsSync(resolve(root, 'orderbhojan/.env.example'))
  ? read('orderbhojan/.env.example')
  : '';
if (envExampleOb) {
  for (const key of [
    'VITE_FF_OB_AI_ASSISTANT',
    'VITE_FF_OB_AI_VOICE',
    'VITE_FF_OB_AI_VOICE_TTS',
    'VITE_FF_OB_AI_POST_ORDER',
    'VITE_FF_OB_AI_PERSONALIZATION',
    'VITE_FF_OB_AI_CANARY_HEADERS',
  ]) {
    const enabled = new RegExp(`^\\s*${key}\\s*=\\s*true`, 'm').test(envExampleOb);
    assert(!enabled, `orderbhojan/.env.example does not set ${key}=true`);
  }
}

if (process.exitCode) {
  console.error('\n=== AI platform defaults FAILED ===');
  process.exit(process.exitCode);
}

console.log('\n=== AI platform defaults PASSED ===');
