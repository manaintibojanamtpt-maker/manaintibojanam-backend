import { useEffect } from 'react';
import { ConsumerAssistantFab } from './ConsumerAssistantFab';
import { ConsumerAssistantSheet } from './ConsumerAssistantSheet';
import { useAssistantConversation } from './useAssistantConversation';

export function ConsumerAssistantShell() {
  const chat = useAssistantConversation();

  useEffect(() => {
    const onOpenVoiceAgent = () => {
      void chat.startVoiceAgent();
    };
    window.addEventListener('ob-voice-agent-open', onOpenVoiceAgent);
    return () => window.removeEventListener('ob-voice-agent-open', onOpenVoiceAgent);
  }, [chat.startVoiceAgent]);

  return (
    <>
      {chat.open ? (
        <ConsumerAssistantSheet
          messages={chat.messages}
          loading={chat.loading}
          validating={chat.validating}
          applying={chat.applying}
          listening={chat.listening}
          speaking={chat.speaking}
          voiceTurnPhase={chat.voiceTurnPhase}
          voiceAgentActive={chat.voiceAgentActive}
          error={chat.error}
          pendingValidation={chat.pendingValidation}
          voiceEnabled={chat.voiceEnabled}
          voiceAvailable={chat.voiceAvailable}
          personalizationEnabled={chat.personalizationEnabled}
          assistMode={chat.postOrderMode ? 'post_order' : 'ordering'}
          voiceLanguage={chat.voiceLanguage}
          onVoiceLanguageChange={chat.setVoiceLanguage}
          onClose={() => chat.setOpen(false)}
          onSend={chat.send}
          onVoiceStart={() => void chat.sendFromVoice()}
          onVoiceCancel={chat.cancelVoice}
          onStartVoiceAgent={() => void chat.startVoiceAgent()}
          onStopVoiceAgent={chat.stopVoiceAgent}
          onFollowHint={chat.followHint}
          onConfirmPlan={chat.confirmApplyPlan}
          onDismissPlan={chat.dismissPlan}
          onClearError={chat.clearError}
        />
      ) : null}
      <ConsumerAssistantFab
        open={chat.open}
        listening={chat.listening}
        voiceAgentActive={chat.voiceAgentActive}
        onToggle={() => {
          if (chat.open) {
            chat.setOpen(false);
            return;
          }
          if (chat.voiceEnabled && chat.voiceAvailable) {
            void chat.startVoiceAgent();
            return;
          }
          chat.setOpen(true);
        }}
      />
    </>
  );
}
