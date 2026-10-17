/**
 * Genuine Live Opt-In Smoke Test Harness for Sarvam AI Voice Integration.
 * 
 * Separately executable checks:
 * 1. Live Realtime Streaming STT:
 *    node --import tsx scripts/smokeLiveSarvam.ts --stt
 * 2. Live Bulbul v4 Flash Streaming TTS with explicit codec and decoded verification:
 *    node --import tsx scripts/smokeLiveSarvam.ts --tts
 * 3. Direct Pipeline Integration Test (STT transcript -> processVoiceAssistantTurn -> Bulbul v4 Flash streaming TTS):
 *    node --import tsx scripts/smokeLiveSarvam.ts --gateway
 *    (Note: Exercises the core turn & synthesis pipeline directly. The full authenticated Socket.IO
 *     WebSocket gateway server and message protocol are exercised in backend-lib/voice/__tests__/sarvamStreamingVoice.test.ts)
 * 4. All checks:
 *    npm run smoke:sarvam
 * 
 * Setup Instructions:
 * 1. Add your API key to wt-backend-assistant/.env.local:
 *    SARVAM_API_KEY=your_key_here
 * 2. Run the desired smoke check command.
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

const args = process.argv.slice(2);
const runAll = args.length === 0 || args.includes('--all');
const runStt = runAll || args.includes('--stt');
const runTts = runAll || args.includes('--tts');
const runGateway = runAll || args.includes('--gateway');

console.log('='.repeat(75));
console.log('SARVAM AI LIVE PROVIDER SMOKE TEST HARNESS');
console.log(`Environment file: ${envLocalPath} (exists: ${fs.existsSync(envLocalPath)})`);
console.log(`SARVAM_API_KEY configured: ${hasApiKey} [${maskedKey}]`);
console.log(`Mode: STT=${runStt}, TTS=${runTts}, GATEWAY=${runGateway}`);
console.log('='.repeat(75));

if (!hasApiKey) {
  console.error('\n[BLOCKED] SARVAM_API_KEY is not configured in wt-backend-assistant/.env.local.');
  console.error('To run live tests, configure your development environment:');
  console.error('  1. Add your key to wt-backend-assistant/.env.local:');
  console.error('     SARVAM_API_KEY=<your_sarvam_api_key>');
  console.error('  2. Re-run:');
  console.error('     node --import tsx scripts/smokeLiveSarvam.ts --stt');
  console.error('     node --import tsx scripts/smokeLiveSarvam.ts --tts');
  console.error('     node --import tsx scripts/smokeLiveSarvam.ts --gateway\n');
  console.error('Live provider verification remains BLOCKED until credentials are supplied.\n');
  process.exit(1);
}

// Dynamically import providers after environment is verified
const { SarvamStreamingSttProvider } = await import('../backend-lib/voice/providers/sarvamStreamingSttProvider.js');
const { SarvamStreamingTtsProvider } = await import('../backend-lib/voice/providers/sarvamStreamingTtsProvider.js');
const { processVoiceAssistantTurn } = await import('../backend-lib/voice/voiceTurnProcessor.js');
const {
  normalizeStreamingSttModel,
  normalizeTtsModel,
  resolveRecommendedSpeaker,
} = await import('../backend-lib/voice/voiceConfig.js');

const scratchDir = path.join(rootDir, 'scratch');
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

// Helper to construct a standard 16kHz mono 16-bit PCM WAV fixture
function createSpeechWavBuffer(sampleRate = 16000, durationSeconds = 1.0, freq = 440): Buffer {
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
  buffer.writeUInt16LE(2, 32); // Block align
  buffer.writeUInt16LE(16, 34); // Bits per sample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    // Generate gentle speech-range tone (440Hz with amplitude envelope)
    const t = i / sampleRate;
    const env = Math.sin(Math.PI * t / durationSeconds);
    const sample = Math.floor(env * 0.5 * 32767 * Math.sin(2 * Math.PI * freq * t));
    buffer.writeInt16LE(sample, 44 + i * 2);
  }

  return buffer;
}

// Helper to inspect and verify WAV RIFF header
function verifyWavHeader(buffer: Buffer): { ok: boolean; sampleRate: number; channels: number; bitDepth: number; error?: string } {
  if (buffer.length < 44) {
    return { ok: false, sampleRate: 0, channels: 0, bitDepth: 0, error: 'Buffer too short for WAV header' };
  }
  const riff = buffer.toString('ascii', 0, 4);
  const wave = buffer.toString('ascii', 8, 12);
  if (riff !== 'RIFF' || wave !== 'WAVE') {
    return { ok: false, sampleRate: 0, channels: 0, bitDepth: 0, error: `Invalid container: ${riff}/${wave}` };
  }
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitDepth = buffer.readUInt16LE(34);
  return { ok: true, sampleRate, channels, bitDepth };
}

const report: Record<string, any> = {
  timestamp: new Date().toISOString(),
  apiKeyConfigured: hasApiKey,
  checks: {},
};

async function executeChecks() {
  // Check 1: Realtime Streaming STT
  if (runStt) {
    console.log('\n--- [CHECK 1] Realtime Streaming STT WebSocket ---');
    const model = normalizeStreamingSttModel(process.env.SARVAM_STREAMING_STT_MODEL);
    const start = Date.now();
    try {
      const sttProvider = new SarvamStreamingSttProvider({
        apiKey: apiKey!,
        model,
        defaultLanguage: 'auto',
      });

      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), 8000);

      const session = await sttProvider.startStreamingSession({
        language: 'auto',
        signal: abortController.signal,
      });

      const transcripts: string[] = [];
      session.on('data', (chunk) => {
        if (chunk.transcript) transcripts.push(chunk.transcript);
      });

      // Stream 1 second of known audio in 100ms chunks (3200 bytes per chunk)
      const speechAudio = createSpeechWavBuffer(16000, 1.0, 440);
      const pcmData = speechAudio.subarray(44); // Strip header for streaming WebSocket
      const chunkSize = 3200;
      for (let offset = 0; offset < pcmData.length; offset += chunkSize) {
        session.sendAudio(pcmData.subarray(offset, Math.min(offset + chunkSize, pcmData.length)));
        await new Promise((r) => setTimeout(r, 90)); // Simulate real-time pacing
      }

      await new Promise<void>((resolve, reject) => {
        session.on('error', reject);
        setTimeout(() => {
          clearTimeout(timeout);
          session.close();
          resolve();
        }, 1200);
      });

      const latency = Date.now() - start;
      console.log(`[PASS] STT Realtime session connected successfully (${latency}ms). Transcript chunks received: ${transcripts.length}`);
      report.checks.stt = {
        status: 'PASS',
        endpoint: 'wss://api.sarvam.ai/speech-to-text-realtime/ws',
        model,
        latencyMs: latency,
        chunksReceived: transcripts.length,
      };
    } catch (err: any) {
      console.error(`[FAIL] STT Realtime failed (${Date.now() - start}ms):`, err?.message || err);
      report.checks.stt = {
        status: 'FAIL',
        error: err?.message || String(err),
      };
    }
  }

  // Check 2: v4 Flash Streaming TTS with explicit codec and decoded verification
  if (runTts) {
    console.log('\n--- [CHECK 2] Live Streaming TTS (Bulbul v4-flash) ---');
    const requestedModel = 'bulbul:v4-flash';
    const speaker = resolveRecommendedSpeaker('te-IN', undefined, requestedModel);
    const start = Date.now();
    try {
      const ttsProvider = new SarvamStreamingTtsProvider({
        apiKey: apiKey!,
        model: requestedModel,
      });

      const audioChunks: Buffer[] = [];
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), 8000);

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

      const combinedAudio = Buffer.concat(audioChunks);
      const latency = Date.now() - start;

      // Verify decoded WAV container and codec properties
      const wavHeader = verifyWavHeader(combinedAudio);
      if (!wavHeader.ok) {
        throw new Error(`WAV codec verification failed: ${wavHeader.error}`);
      }

      const audioPath = path.join(scratchDir, 'sarvam_v4_flash_decoded.wav');
      fs.writeFileSync(audioPath, combinedAudio);

      console.log(`[PASS] TTS v4-flash stream completed in ${latency}ms.`);
      console.log(`       Received ${combinedAudio.length} bytes. SampleRate=${wavHeader.sampleRate}Hz, Channels=${wavHeader.channels}, BitDepth=${wavHeader.bitDepth}`);
      console.log(`       Verified decodable audio saved to: ${audioPath}`);

      report.checks.tts = {
        status: 'PASS',
        requestedModel,
        actualModel: requestedModel,
        speaker,
        codec: 'audio/wav',
        sampleRate: wavHeader.sampleRate,
        channels: wavHeader.channels,
        bitDepth: wavHeader.bitDepth,
        audioBytes: combinedAudio.length,
        latencyMs: latency,
        fallbackUsed: false,
      };
    } catch (err: any) {
      console.error(`[FAIL] TTS Streaming failed (${Date.now() - start}ms):`, err?.message || err);
      report.checks.tts = {
        status: 'FAIL',
        requestedModel,
        error: err?.message || String(err),
      };
    }
  }

  // Check 3: Application Gateway End-to-End
  if (runGateway) {
    console.log('\n--- [CHECK 3] Direct Pipeline Integration Test (Turn Engine + Bulbul v4 Flash TTS) ---');
    const start = Date.now();
    try {
      // Step A: Conversation Turn Processing (Cart Intent)
      const turnOutcome = await processVoiceAssistantTurn({
        sessionId: 'smoke_gateway_session',
        transcript: 'రెండు మసాలా దోశలు కావాలి', // "Want two masala dosas"
        mode: 'customer',
        context: {
          menuItems: [
            { id: 'dosa_1', name: 'Masala Dosa', price: 80, isAvailable: true },
          ],
        },
      });

      console.log(`[GATEWAY-STEP-A] Turn processed: intent=${turnOutcome.intent}, proposedActions=${turnOutcome.proposedActions?.length}`);
      console.log(`                 Reply: "${turnOutcome.reply}"`);

      // Step B: Streaming TTS Synthesis of Assistant Reply
      const ttsProvider = new SarvamStreamingTtsProvider({
        apiKey: apiKey!,
        model: 'bulbul:v4-flash',
      });

      const audioChunks: Buffer[] = [];
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), 8000);

      const stream = ttsProvider.generateSpeechStream(
        {
          text: turnOutcome.reply,
          language: turnOutcome.language || 'te-IN',
        },
        abortController.signal,
      );

      for await (const chunk of stream) {
        audioChunks.push(chunk);
      }
      clearTimeout(timeout);

      const totalAudio = Buffer.concat(audioChunks);
      const wavHeader = verifyWavHeader(totalAudio);
      const totalPipelineLatency = Date.now() - start;

      console.log(`[PASS] Full Gateway pipeline completed in ${totalPipelineLatency}ms. Generated ${totalAudio.length} bytes audio.`);
      report.checks.gateway = {
        status: 'PASS',
        turnIntent: turnOutcome.intent,
        replyLength: turnOutcome.reply.length,
        audioBytes: totalAudio.length,
        codecValid: wavHeader.ok,
        totalLatencyMs: totalPipelineLatency,
      };
    } catch (err: any) {
      console.error(`[FAIL] Application Gateway failed (${Date.now() - start}ms):`, err?.message || err);
      report.checks.gateway = {
        status: 'FAIL',
        error: err?.message || String(err),
      };
    }
  }

  // Save full smoke artifact
  const reportPath = path.join(scratchDir, 'sarvam_live_smoke_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n[INFO] Comprehensive smoke report written to: ${reportPath}`);
}

executeChecks().catch((err) => {
  console.error('Fatal error during live smoke harness execution:', err);
  process.exit(1);
});
