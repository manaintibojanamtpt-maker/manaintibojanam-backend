import { useCallback } from 'react';
import { getDb } from '../lib/firebase-db';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export function useAIAnalytics() {
  const { currentUser } = useAuth();

  const logEvent = useCallback(async (
    eventName: 'ai_session_started' | 'ai_message_sent' | 'ai_tool_invoked' | 'ai_tool_failed' | 'ai_action_confirmed' | 'ai_action_cancelled' | 'ai_feedback_submitted' | 'ai_assisted_checkout',
    payload: Record<string, any> = {}
  ) => {
    try {
      const db = getDb();
      await addDoc(collection(db, 'aiAnalytics'), {
        eventName,
        ...payload,
        userId: currentUser?.uid || 'anonymous',
        timestamp: serverTimestamp(),
      });
      console.log(`[AI Analytics] ${eventName}`, payload);
    } catch (e) {
      console.warn("Failed to log AI event", e);
    }
  }, [currentUser]);

  return { logEvent };
}
