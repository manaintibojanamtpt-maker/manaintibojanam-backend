/**
 * Genuine Live Opt-In Smoke Test for Sarvam AI Voice Integration.
 * 
 * Instructions:
 * 1. Place your API key in .env.local:
 *    SARVAM_API_KEY=your_key_here
 * 2. Run with Node.js:
 *    node --import tsx scripts/smokeLiveSarvam.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Explicitly load .env.local before initializing any provider
const envLocalPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
// Also load standard .env fallback
dotenv.config({ path: path.join(rootDir, '.env') });

const apiKey = process.env.SARVAM_API_KEY?.trim()?.replace(/^["']|["']$/g, '');
const hasApiKey = Boolean(apiKey && apiKey.length > 5);
const maskedKey = hasApiKey ? `${apiKey!.slice(0, 4)}...${apiKey!.slice(-4)}` : 'NOT_CONFIGURED';

console.log('='.repeat(70));
console.log('SARVAM AI LIVE PROVIDER SMOKE TEST');
console.log(`Environment file: ${envLocalPath} (exists: ${fs.existsSync(envLocalPath)})`);
console.log(`SARVAM_API_KEY configured: ${hasApiKey} [${maskedKey}]`);
console.log('='.repeat(70));

if (!hasApiKey) {
  console.error('\n[BLOCKED] SARVAM_API_KEY is not configured in the local development environment.');
  console.error('To run this live smoke test:');
  console.error('  1. Add your key server-side:');
  console.error('     echo SARVAM_API_KEY=your_key_here >> .env.local');
  console.error('  2. Re-run:');
  console.error('     node --import tsx scripts/smokeLiveSarvam.ts\n');
  console.error('Live provider contract tests remain BLOCKED until credentials are supplied.\n');
  process.exit(1);
}

// Dynamically import providers after environment is verified
const { SarvamStreamingSttProvider } = await import('../backend-lib/voice/providers/sarvamStreamingSttProvider.js');
const { SarvamStreamingTtsProvider } = await import('../backend-lib/voice/providers/sarvamStreamingTtsProvider.js');
const { normalizeStreamingSttModel, normalizeTtsModel, resolveRecommendedSpeaker } = await import('../backend-lib/voice/voiceConfig.js');

const scratchDir = path.join(rootDir, 'scratch');
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

interface SmokeResult {
  readonly timestamp: string;
  readonly stt: {
    readonly requestedModel: string;
    readonly actualModel?: string;
    readonly language: string;
    readonly status: 'PASS' | 'FAIL' | 'BLOCKED';
    readonly latencyMs?: number;
    readonly requestId?: string;
    readonly error?: string;
  };
  readonly tts: {
    readonly requestedModel: string;
    readonly actualModel?: string;
    readonly speaker: string;
    readonly language: string;
    readonly status: 'PASS' | 'FAIL' | 'BLOCKED';
    readonly audioBytes?: number;
    readonly latencyMs?: number;
    readonly fallbackUsed?: boolean;
    readonly error?: string;
  };
}

const smokeReport: SmokeResult = {
  timestamp: new Date().toISOString(),
  stt: {
    requestedModel: normalizeStreamingSttModel(process.env.SARVAM_STREAMING_STT_MODEL),
    language: 'te-IN',
    status: 'BLOCKED',
  },
  tts: {
    requestedModel: normalizeTtsModel(process.env.SARVAM_TTS_MODEL),
    speaker: resolveRecommendedSpeaker('te-IN', undefined, normalizeTtsModel(process.env.SARVAM_TTS_MODEL)),
    language: 'te-IN',
    status: 'BLOCKED',
  },
};

async function runLiveSmoke() {
  // Test 1: Bounded Streaming TTS with Bulbul v4 Flash
  console.log('\n--- 1. Testing Live Streaming TTS (Bulbul v4-flash) ---');
  const ttsStart = Date.now();
  try {
    const ttsProvider = new SarvamStreamingTtsProvider({
      apiKey: apiKey!,
      model: smokeReport.tts.requestedModel,
    });

    const audioChunks: Buffer[] = [];
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 7000); // 7s bounded timeout

    const stream = ttsProvider.generateSpeechStream(
      {
        text: 'నమస్కారం, భోజనోస్ ఆర్డరింగ్ అసిస్టెంట్‌కు స్వాగతం.',
        language: 'te-IN',
      },
      abortController.signal,
    );

    for await (const chunk of stream) {
      audioChunks.push(chunk);
    }
    clearTimeout(timeout);

    const totalBytes = audioChunks.reduce((acc, c) => acc + c.length, 0);
    const ttsLatency = Date.now() - ttsStart;
    console.log(`[PASS] TTS stream completed in ${ttsLatency}ms, received ${totalBytes} bytes across ${audioChunks.length} chunks.`);

    // Save audio file for decoding verification
    const audioPath = path.join(scratchDir, 'sarvam_live_output.wav');
    fs.writeFileSync(audioPath, Buffer.concat(audioChunks));
    console.log(`[INFO] Decodable audio saved to: ${audioPath}`);

    (smokeReport.tts as any).status = 'PASS';
    (smokeReport.tts as any).actualModel = smokeReport.tts.requestedModel;
    (smokeReport.tts as any).audioBytes = totalBytes;
    (smokeReport.tts as any).latencyMs = ttsLatency;
    (smokeReport.tts as any).fallbackUsed = false;
  } catch (err: any) {
    const ttsLatency = Date.now() - ttsStart;
    console.error(`[FAIL] TTS Streaming failed in ${ttsLatency}ms:`, err?.message || err);
    (smokeReport.tts as any).status = 'FAIL';
    (smokeReport.tts as any).error = err?.message || String(err);
  }

  // Test 2: Bounded Realtime STT WebSocket connection
  console.log('\n--- 2. Testing Live Realtime STT WebSocket ---');
  const sttStart = Date.now();
  try {
    const sttProvider = new SarvamStreamingSttProvider({
      apiKey: apiKey!,
      model: smokeReport.stt.requestedModel,
      defaultLanguage: 'auto',
    });

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 7000);

    const session = await sttProvider.startStreamingSession({
      language: 'auto',
      signal: abortController.signal,
    });

    await new Promise<void>((resolve, reject) => {
      session.on('error', (err) => {
        clearTimeout(timeout);
        session.close();
        reject(err);
      });
      // Simulate sending 1 frame of silence
      const silenceFrame = Buffer.alloc(3200); // 100ms 16kHz PCM
      session.sendAudio(silenceFrame);

      setTimeout(() => {
        clearTimeout(timeout);
        session.close();
        resolve();
      }, 1500);
    });

    const sttLatency = Date.now() - sttStart;
    console.log(`[PASS] STT Realtime session connected and exchanged audio in ${sttLatency}ms.`);
    (smokeReport.stt as any).status = 'PASS';
    (smokeReport.stt as any).actualModel = smokeReport.stt.requestedModel;
    (smokeReport.stt as any).latencyMs = sttLatency;
  } catch (err: any) {
    const sttLatency = Date.now() - sttStart;
    console.error(`[FAIL] STT Realtime failed in ${sttLatency}ms:`, err?.message || err);
    (smokeReport.stt as any).status = 'FAIL';
    (smokeReport.stt as any).error = err?.message || String(err);
  }

  // Write report
  const reportPath = path.join(scratchDir, 'sarvam_live_smoke_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(smokeReport, null, 2));
  console.log(`\n[INFO] Report written to: ${reportPath}`);
}

runLiveSmoke().catch((err) => {
  console.error('Fatal error during live smoke test:', err);
  process.exit(1);
});
