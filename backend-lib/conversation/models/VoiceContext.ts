/**
 * Purpose: Contextual parameters for the acoustic/UI environment and user settings.
 * Public API: VoiceContext interface
 * Dependencies: None
 * Consumers: ConversationEngine
 * Future phases: Will incorporate Voice Activity Detection (VAD) and noise metrics.
 */

export interface VoiceContext {
  readonly clientPlatform: 'web' | 'android' | 'ios' | 'unknown';
  readonly preferredLanguage?: string;
  readonly backgroundNoiseLevel?: number; // scale 0-1
  readonly deviceCapabilities?: {
    readonly supportsNativeSTT: boolean;
    readonly supportsNativeTTS: boolean;
  };
}
