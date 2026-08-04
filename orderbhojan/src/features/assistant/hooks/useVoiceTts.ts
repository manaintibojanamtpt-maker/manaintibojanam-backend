import { useCallback, useState } from 'react';
import { isSpeechSynthesisAvailable, speakVoiceConfirmation } from '../infrastructure/voiceSpeechSynthesis';
import { AssistantApiError } from '../types';
import { useAiVoiceTtsFeature } from '../hooks/useAiVoiceTtsFeature';
import { toSpokenAssistantReply } from '../domain/isConfirmCartUserMessage';

export function useVoiceTts() {
  const ttsEnabled = useAiVoiceTtsFeature();
  const [speaking, setSpeaking] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState('en-IN');

  const speakReply = useCallback(
    async (reply: string | undefined, signal: AbortSignal, forceSpeak: boolean) => {
      const spoken = toSpokenAssistantReply(reply ?? '');
      if (!spoken) return;
      if (!forceSpeak && !ttsEnabled) return;
      if (!isSpeechSynthesisAvailable()) return;
      
      setSpeaking(true);
      try {
        await speakVoiceConfirmation({ text: spoken, signal, lang: voiceLanguage });
      } catch (ttsErr) {
        if (
          ttsErr instanceof AssistantApiError &&
          (ttsErr.code === 'AI_TTS_ABORTED' || ttsErr.code === 'AI_VOICE_ABORTED')
        ) {
          return;
        }
      } finally {
        setSpeaking(false);
      }
    },
    [ttsEnabled, voiceLanguage],
  );

  return {
    speaking,
    setSpeaking,
    voiceLanguage,
    setVoiceLanguage,
    speakReply,
  };
}
