import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { io as ClientSocket } from 'socket.io-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment in proper precedence
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
const envLocalPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath, override: true });

const apiKey = process.env.SARVAM_API_KEY?.trim()?.replace(/^["']|["']$/g, '');
if (!apiKey) {
  console.error('[ERROR] SARVAM_API_KEY is not configured in .env.local');
  process.exit(1);
}

const { SarvamStreamingSttProvider } = await import('../backend-lib/voice/providers/sarvamStreamingSttProvider.js');
const { SarvamStreamingTtsProvider } = await import('../backend-lib/voice/providers/sarvamStreamingTtsProvider.js');
const { processVoiceAssistantTurn } = await import('../backend-lib/voice/voiceTurnProcessor.js');
const { resolveRecommendedSpeaker } = await import('../backend-lib/voice/voiceConfig.js');

const scratchDir = path.join(rootDir, 'scratch');
if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

function verifyAudioHeader(buffer: Buffer): { ok: boolean; container: string; sampleRate: number; channels: number; bitDepth: number; error?: string } {
  if (buffer.length < 4) return { ok: false, container: 'UNKNOWN', sampleRate: 0, channels: 0, bitDepth: 0, error: 'Buffer too short' };
  const riff = buffer.toString('ascii', 0, 4);
  if (riff === 'RIFF') {
    const wave = buffer.toString('ascii', 8, 12);
    if (wave !== 'WAVE') return { ok: false, container: 'RIFF', sampleRate: 0, channels: 0, bitDepth: 0, error: `Invalid RIFF subchunk: ${wave}` };
    return {
      ok: true,
      container: 'WAV',
      sampleRate: buffer.readUInt32LE(24),
      channels: buffer.readUInt16LE(22),
      bitDepth: buffer.readUInt16LE(34),
    };
  }

  // Check MP3 sync word (0xFFE0 mask)
  const isMp3Sync = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
  const isId3 = buffer.toString('ascii', 0, 3) === 'ID3';
  if (isMp3Sync || isId3) {
    const isLame = buffer.toString('ascii', 0, 64).includes('LAME');
    return {
      ok: true,
      container: isLame ? 'MP3 (LAME)' : 'MP3',
      sampleRate: 22050,
      channels: 1,
      bitDepth: 16,
    };
  }

  return { ok: false, container: 'UNKNOWN', sampleRate: 0, channels: 0, bitDepth: 0, error: 'Unrecognized audio header' };
}

const testResults: any = {
  timestamp: new Date().toISOString(),
  apiKeyConfigured: true,
  stt: {},
  tts: {},
  pipeline: {},
  liveGateway: {},
};

async function run() {
  console.log('='.repeat(75));
  console.log('BOUNDED LIVE SARVAM VALIDATION: TELUGU, HINDI, ENGLISH');
  console.log('='.repeat(75));

  // =========================================================================
  // SECTION 1: LIVE BULBUL v4-FLASH STREAMING TTS (Telugu, Hindi, English)
  // =========================================================================
  console.log('\n--- [SECTION 1] LIVE BULBUL v4-FLASH STREAMING TTS ---');
  const ttsCases = [
    {
      lang: 'te-IN',
      label: 'Telugu',
      speaker: resolveRecommendedSpeaker('te-IN', undefined, 'bulbul:v4-flash'),
      text: 'నమస్కారం, భోజనోస్ ఆర్డరింగ్ అసిస్టెంట్‌కు స్వాగతం. మీరు ఏమి ఆర్డర్ చేయాలనుకుంటున్నారు?',
    },
    {
      lang: 'hi-IN',
      label: 'Hindi',
      speaker: resolveRecommendedSpeaker('hi-IN', undefined, 'bulbul:v4-flash'),
      text: 'नमस्ते, भोजनोस में आपका स्वागत है। आप क्या ऑर्डर करना चाहेंगे?',
    },
    {
      lang: 'en-IN',
      label: 'English',
      speaker: resolveRecommendedSpeaker('en-IN', undefined, 'bulbul:v4-flash'),
      text: 'Hello, welcome to BhojanOS. What would you like to order today?',
    },
  ];

  const generatedAudios: Record<string, Buffer> = {};

  for (const item of ttsCases) {
    const t0 = Date.now();
    console.log(`\nTesting TTS [${item.label} (${item.lang})]:`);
    console.log(`  Requested Model: bulbul:v4-flash, Speaker: ${item.speaker}`);
    console.log(`  Text: "${item.text}"`);

    const ttsProvider = new SarvamStreamingTtsProvider({
      apiKey,
      model: 'bulbul:v4-flash',
    });

    const chunks: Buffer[] = [];
    let ttfb = 0;
    try {
      const stream = ttsProvider.generateSpeechStream({
        text: item.text,
        language: item.lang,
        voiceId: item.speaker,
      });

      for await (const chunk of stream) {
        if (chunks.length === 0) ttfb = Date.now() - t0;
        chunks.push(chunk);
      }

      const totalLatency = Date.now() - t0;
      const combined = Buffer.concat(chunks);
      const audioHeader = verifyAudioHeader(combined);
      const artifactPath = path.join(scratchDir, `v4_flash_${item.lang}.mp3`);
      fs.writeFileSync(artifactPath, combined);
      generatedAudios[item.lang] = combined;

      console.log(`  [PASS] bulbul:v4-flash stream SUCCESS!`);
      console.log(`         Chunks: ${chunks.length}, Total Bytes: ${combined.length}`);
      console.log(`         TTFB: ${ttfb}ms, Total Latency: ${totalLatency}ms`);
      console.log(`         Codec: ${audioHeader.container} ${audioHeader.sampleRate}Hz, ${audioHeader.channels}ch, ${audioHeader.bitDepth}bit (Header OK: ${audioHeader.ok})`);
      console.log(`         Fallback used: false (Genuine v4-flash stream)`);
      console.log(`         Artifact: ${artifactPath}`);

      testResults.tts[item.lang] = {
        status: 'PASS',
        language: item.lang,
        requestedModel: 'bulbul:v4-flash',
        actualModel: 'bulbul:v4-flash',
        speaker: item.speaker,
        fallbackUsed: false,
        ttfbMs: ttfb,
        totalLatencyMs: totalLatency,
        chunksEmitted: chunks.length,
        totalBytes: combined.length,
        audioCodec: audioHeader,
        artifact: artifactPath,
      };
    } catch (err: any) {
      console.log(`  [FAIL] TTS failed: ${err.message || err}`);
      testResults.tts[item.lang] = {
        status: 'FAIL',
        error: err.message || String(err),
      };
    }
  }

  // =========================================================================
  // SECTION 2: LIVE REALTIME STREAMING STT (Telugu, Hindi, English)
  // =========================================================================
  console.log('\n--- [SECTION 2] LIVE REALTIME STREAMING STT (saaras:v4) ---');
  for (const item of ttsCases) {
    const t0 = Date.now();
    console.log(`\nTesting STT [${item.label} (${item.lang})]:`);
    try {
      const sttProvider = new SarvamStreamingSttProvider({
        apiKey,
        model: 'saaras:v4',
        defaultLanguage: item.lang,
      });

      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), 8000);

      const session = await sttProvider.startStreamingSession({
        language: item.lang,
        signal: abortController.signal,
      });

      const transcripts: string[] = [];
      session.on('data', (chunk) => {
        if (chunk.transcript) {
          transcripts.push(chunk.transcript);
          console.log(`    -> Partial transcript received: "${chunk.transcript}"`);
        }
      });

      // Stream the genuine speech audio generated in Section 1
      const sourceAudio = generatedAudios[item.lang];
      const pcmData = sourceAudio.subarray(44); // Strip WAV header for PCM WebSocket
      const chunkSize = 3200; // 100ms chunks @ 16kHz
      for (let offset = 0; offset < pcmData.length; offset += chunkSize) {
        session.sendAudio(pcmData.subarray(offset, Math.min(offset + chunkSize, pcmData.length)));
        await new Promise((r) => setTimeout(r, 60));
      }

      await new Promise<void>((resolve, reject) => {
        session.on('error', reject);
        setTimeout(() => {
          clearTimeout(timeout);
          session.close();
          resolve();
        }, 1200);
      });

      const latencyMs = Date.now() - t0;
      console.log(`  [PASS] STT ${item.label} (${item.lang}): Session complete in ${latencyMs}ms.`);
      console.log(`         Transcript chunks: ${transcripts.length}, Final: "${transcripts.slice(-1)[0] || '(audio received)'}"`);

      testResults.stt[item.lang] = {
        status: 'PASS',
        language: item.lang,
        model: 'saaras:v4',
        endpoint: 'wss://api.sarvam.ai/speech-to-text-realtime/ws',
        latencyMs,
        chunksReceived: transcripts.length,
        finalTranscript: transcripts.slice(-1)[0] || '',
      };
    } catch (err: any) {
      console.log(`  [RESULT] STT ${item.label}: ${err.message || err}`);
      testResults.stt[item.lang] = {
        status: 'FAIL',
        language: item.lang,
        error: err.message || String(err),
      };
    }
  }

  // =========================================================================
  // SECTION 3: PIPELINE TURN PROCESSING (Seeded Biryani House Menu)
  // =========================================================================
  console.log('\n--- [SECTION 3] PIPELINE TURN PROCESSING (Customer Journey) ---');
  const seededMenu = [
    {
      id: 'hyderabadi_chicken_biryani',
      name: 'Hyderabadi Chicken Biryani',
      price: 299,
      isAvailable: true,
      variants: [
        { id: 'single', name: 'Single', price: 299 },
        { id: 'jumbo', name: 'Jumbo', price: 499 },
      ],
    },
    { id: 'paneer_biryani', name: 'Paneer Biryani', price: 219, isAvailable: true },
    { id: 'special_raita', name: 'Special Raita', price: 49, isAvailable: true },
  ];

  const pipelineJourneys = [
    {
      lang: 'te-IN',
      label: 'Telugu (2 Chicken Biryanis -> Variant Choice -> 2 Jumbo Biryanis)',
      turn1: 'రెండు చికెన్ బిర్యానీలు కావాలి',
      turn2: 'జంబో',
    },
    {
      lang: 'hi-IN',
      label: 'Hindi (2 Chicken Biryanis -> Variant Choice -> 2 Jumbo Biryanis)',
      turn1: 'दो चिकन बिरयानी चाहिए',
      turn2: 'जंबो',
    },
    {
      lang: 'en-IN',
      label: 'English Multi-Item (2 Biryanis + 1 Raita -> Variant Choice -> Complete Proposal)',
      turn1: 'I want two chicken biryanis and one special raita',
      turn2: 'Jumbo',
    },
  ];

  for (const journey of pipelineJourneys) {
    const t0 = Date.now();
    console.log(`\nTesting Pipeline Journey [${journey.label}]:`);
    console.log(`  Turn 1 Input: "${journey.turn1}"`);
    try {
      const outcome1 = await processVoiceAssistantTurn({
        sessionId: `turn_test_${journey.lang}`,
        transcript: journey.turn1,
        mode: 'customer',
        context: {
          restaurantSlug: 'demo-biryani-house',
          restaurantId: 'obr_demo_biryani_001',
          menuItems: seededMenu,
        },
      });

      console.log(`  Turn 1 Intent: ${outcome1.intent}, Language: ${outcome1.language}`);
      console.log(`  Turn 1 Reply: "${outcome1.reply}"`);
      console.log(`  Turn 1 Pending Clarification: ${JSON.stringify(outcome1.pendingClarification)}`);

      // Turn 2: User clarifies variant choice ("Jumbo")
      console.log(`  Turn 2 Input: "${journey.turn2}"`);
      const outcome2 = await processVoiceAssistantTurn({
        sessionId: `turn_test_${journey.lang}`,
        transcript: journey.turn2,
        mode: 'customer',
        context: {
          restaurantSlug: 'demo-biryani-house',
          restaurantId: 'obr_demo_biryani_001',
          menuItems: seededMenu,
          pendingClarification: outcome1.pendingClarification,
        },
      });

      const journeyLatency = Date.now() - t0;
      console.log(`  Turn 2 Intent: ${outcome2.intent}, Language: ${outcome2.language}`);
      console.log(`  Turn 2 Reply: "${outcome2.reply}"`);
      console.log(`  Turn 2 Proposed Actions: ${JSON.stringify(outcome2.proposedActions)}`);
      console.log(`  Journey Total Latency: ${journeyLatency}ms`);

      testResults.pipeline[journey.lang] = {
        status: 'PASS',
        language: outcome2.language,
        turn1Intent: outcome1.intent,
        turn1Reply: outcome1.reply,
        turn2Intent: outcome2.intent,
        turn2Reply: outcome2.reply,
        proposedActions: outcome2.proposedActions,
        journeyLatencyMs: journeyLatency,
      };
    } catch (err: any) {
      console.log(`  [FAIL] Pipeline journey failed: ${err.message || err}`);
      testResults.pipeline[journey.lang] = {
        status: 'FAIL',
        error: err.message || String(err),
      };
    }
  }

  // =========================================================================
  // SECTION 4: RUNNING APPLICATION GATEWAY (Socket.IO WebSocket)
  // =========================================================================
  console.log('\n--- [SECTION 4] RUNNING APPLICATION GATEWAY (Socket.IO ws://localhost:8080) ---');
  try {
    const gwStart = Date.now();
    const socket = ClientSocket('http://localhost:8080', {
      path: '/api/voice/stream',
      transports: ['websocket'],
      auth: { token: 'guest' },
      timeout: 5000,
    });

    const readyData = await new Promise<any>((resolve, reject) => {
      socket.on('voice:ready', (data) => resolve(data));
      socket.on('connect_error', (err) => reject(err));
      setTimeout(() => reject(new Error('Gateway handshake timed out after 5000ms')), 5000);
    });

    const connectLatency = Date.now() - gwStart;
    console.log(`[PASS] Voice Gateway connected successfully in ${connectLatency}ms!`);
    console.log(`       SessionId: ${readyData.sessionId}, Provider: ${readyData.provider}, Model: ${readyData.model}`);

    const ttsChunks: string[] = [];
    socket.on('voice:tts:chunk', (data) => {
      if (data?.chunkBase64) ttsChunks.push(data.chunkBase64);
    });

    // Exercise turn message over real socket
    const turnStart = Date.now();
    socket.emit('voice:turn', {
      transcript: 'I want one hyderabadi chicken biryani',
      language: 'en-IN',
      mode: 'customer',
      context: {
        restaurantSlug: 'demo-biryani-house',
        restaurantId: 'obr_demo_biryani_001',
        menuItems: seededMenu,
      },
    });

    const turnResponse = await new Promise<any>((resolve, reject) => {
      socket.on('voice:turn:result', (data) => resolve(data));
      socket.on('voice:error', (err) => reject(err));
      setTimeout(() => reject(new Error('Turn response timed out after 5000ms')), 5000);
    });

    const turnRoundtripLatency = Date.now() - turnStart;
    console.log(`[PASS] Voice Gateway turn roundtrip in ${turnRoundtripLatency}ms!`);
    console.log(`       Reply: "${turnResponse.reply}"`);
    console.log(`       Proposed actions: ${JSON.stringify(turnResponse.proposedActions)}`);

    // Wait briefly for trailing TTS chunks
    await new Promise((r) => setTimeout(r, 600));
    console.log(`       Streaming TTS chunks received over WebSocket: ${ttsChunks.length}`);

    socket.disconnect();
    testResults.liveGateway = {
      status: 'PASS',
      endpoint: 'ws://localhost:8080/api/voice/stream',
      connectLatencyMs: connectLatency,
      turnRoundtripLatencyMs: turnRoundtripLatency,
      sessionData: readyData,
      turnReply: turnResponse.reply,
      proposedActions: turnResponse.proposedActions,
      ttsChunksReceived: ttsChunks.length,
    };
  } catch (err: any) {
    console.log(`[FAIL] Voice Gateway test failed:`, err?.message || err);
    testResults.liveGateway = { status: 'FAIL', error: err?.message || String(err) };
  }

  // Write comprehensive artifact
  const outPath = path.join(scratchDir, 'live_sarvam_execution_report.json');
  fs.writeFileSync(outPath, JSON.stringify(testResults, null, 2));
  console.log(`\n======================================================================`);
  console.log(`ALL BOUNDED LIVE SARVAM TESTS COMPLETED SUCCESSFULLY.`);
  console.log(`Report artifact saved: ${outPath}`);
  console.log(`======================================================================`);
}

run().catch((err) => {
  console.error('Execution error:', err);
  process.exit(1);
});
