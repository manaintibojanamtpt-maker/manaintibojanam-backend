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
    async (reply: string | undefined, signal: AbortSignal, forceSpeak: boolean, lang?: string) => {
      const spoken = toSpokenAssistantReply(reply ?? '');
      if (!spoken) return;
      if (!forceSpeak && !ttsEnabled) return;
      if (!isSpeechSynthesisAvailable()) return;
      
      let targetLang = lang || voiceLanguage;
      if (/[\u0C00-\u0C7F]/.test(spoken)) {
        targetLang = 'te-IN';
      } else if (/[\u0900-\u097F]/.test(spoken)) {
        targetLang = 'hi-IN';
      }

      setSpeaking(true);
      try {
        await speakVoiceConfirmation({ text: spoken, signal, lang: targetLang });
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
