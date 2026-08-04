import { useState } from 'react';
import { useConsumerAssist } from './useConsumerAssist';
import { usePostOrderAssist } from './usePostOrderAssist';
import { useValidateCartPlan } from './useValidateCartPlan';

export function useAssistantApi() {
  const { ask } = useConsumerAssist();
  const { ask: askPostOrder, enabled: postOrderAssistEnabled } = usePostOrderAssist();
  const { validate } = useValidateCartPlan();
  
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return {
    ask,
    askPostOrder,
    postOrderAssistEnabled,
    validate,
    loading,
    setLoading,
    validating,
    setValidating,
    error,
    setError,
  };
}
