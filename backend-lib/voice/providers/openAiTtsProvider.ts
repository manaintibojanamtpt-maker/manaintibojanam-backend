export interface OmniRouteTtsRequest {
  readonly text: string;
  readonly voiceId?: string; // e.g., 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
}

export interface OmniRouteTtsProvider {
  generateSpeech(req: OmniRouteTtsRequest, signal?: AbortSignal): Promise<Buffer>;
}

export class OpenAiTtsProvider implements OmniRouteTtsProvider {
  constructor(private readonly apiKey: string) {}

  async generateSpeech(req: OmniRouteTtsRequest, signal?: AbortSignal): Promise<Buffer> {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: req.text,
        voice: req.voiceId || 'alloy',
        response_format: 'mp3'
      }),
      signal
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`OpenAI TTS Error ${response.status}: ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
