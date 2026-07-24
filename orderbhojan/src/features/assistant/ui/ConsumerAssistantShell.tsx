import { ConsumerAssistantFab } from './ConsumerAssistantFab';
import { ConsumerAssistantSheet } from './ConsumerAssistantSheet';
import { useAssistantConversation } from './useAssistantConversation';

export function ConsumerAssistantShell() {
  const chat = useAssistantConversation();

  return (
    <>
      {chat.open ? (
        <ConsumerAssistantSheet
          messages={chat.messages}
          loading={chat.loading}
          validating={chat.validating}
          applying={chat.applying}
          listening={chat.listening}
          error={chat.error}
          pendingValidation={chat.pendingValidation}
          voiceEnabled={chat.voiceEnabled}
          voiceAvailable={chat.voiceAvailable}
          personalizationEnabled={chat.personalizationEnabled}
          assistMode={chat.postOrderMode ? 'post_order' : 'ordering'}
          onClose={() => chat.setOpen(false)}
          onSend={chat.send}
          onVoiceStart={() => void chat.sendFromVoice()}
          onVoiceCancel={chat.cancelVoice}
          onFollowHint={chat.followHint}
          onConfirmPlan={chat.confirmApplyPlan}
          onDismissPlan={chat.dismissPlan}
          onClearError={chat.clearError}
        />
      ) : null}
      <ConsumerAssistantFab open={chat.open} onToggle={() => chat.setOpen((v) => !v)} />
    </>
  );
}
