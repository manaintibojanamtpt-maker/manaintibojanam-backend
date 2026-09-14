import type { GreetingContextType } from './voiceFirstSession';

export interface GreetingMessageResult {
  text: string;
  spokenText: string;
  language: string;
}

export function resolveLanguageCode(lang?: string): 'te-IN' | 'hi-IN' | 'en-IN' {
  if (!lang) return 'en-IN';
  const lower = lang.toLowerCase();
  if (lower.startsWith('te')) return 'te-IN';
  if (lower.startsWith('hi')) return 'hi-IN';
  return 'en-IN';
}

export function getGreetingMessage(
  contextType: GreetingContextType,
  preferredLanguage?: string,
  restaurantName?: string,
): GreetingMessageResult {
  const lang = resolveLanguageCode(preferredLanguage);
  const cleanName = restaurantName?.trim();

  switch (lang) {
    case 'te-IN': {
      if (contextType === 'returning_cart') {
        const text = 'నమస్కారం! మీ కార్ట్‌లో వంటకాలు సిద్ధంగా ఉన్నాయి. వాటిని ఆర్డర్ చేయమంటారా లేదా కొత్తవి జోడించమంటారా?';
        return { text, spokenText: text, language: 'te-IN' };
      }
      if (contextType === 'kitchen' && cleanName) {
        const text = `${cleanName}కి స్వాగతం! ఇవాళ ఇక్కడ ఏం ఆర్డర్ చేయాలనిపిస్తోంది? మైక్ నొక్కి చెప్పండి.`;
        return { text, spokenText: text, language: 'te-IN' };
      }
      if (contextType === 'general_returning') {
        const text = 'నమస్కారం! మళ్లీ కలుసుకున్నందుకు సంతోషం. ఇవాళ మీకు ఏ ఇంటి వంటకం కావాలో మైక్ నొక్కి చెప్పండి.';
        return { text, spokenText: text, language: 'te-IN' };
      }
      const text = 'నమస్కారం! ఆర్డర్‌భోజన్‌కి స్వాగతం. మీకు ఏ వంటకం కావాలో మైక్ నొక్కి చెప్పండి, నేను ఆర్డర్ చేయడానికి సహాయం చేస్తాను.';
      return { text, spokenText: text, language: 'te-IN' };
    }

    case 'hi-IN': {
      if (contextType === 'returning_cart') {
        const text = 'नमस्ते! आपके कार्ट में व्यंजन मौजूद हैं। क्या आप ऑर्डर कन्फ़र्म करना चाहते हैं या कुछ और जोड़ना है?';
        return { text, spokenText: text, language: 'hi-IN' };
      }
      if (contextType === 'kitchen' && cleanName) {
        const text = `${cleanName} में आपका स्वागत है! आज यहाँ से क्या मंगाना चाहेंगे? माइक दबाकर बताएं।`;
        return { text, spokenText: text, language: 'hi-IN' };
      }
      if (contextType === 'general_returning') {
        const text = 'नमस्ते! फिर से स्वागत है। आज आप कौन सा घर का बना खाना खाना चाहेंगे? माइक दबाकर बताएं।';
        return { text, spokenText: text, language: 'hi-IN' };
      }
      const text = 'नमस्ते! OrderBhojan में आपका स्वागत है। आपको क्या खाना है, माइक दबाकर बताएं — मैं ऑर्डर करने में मदद करूँगा।';
      return { text, spokenText: text, language: 'hi-IN' };
    }

    case 'en-IN':
    default: {
      if (contextType === 'returning_cart') {
        const text = 'Welcome back! You have items waiting in your cart. Would you like to review or add more dishes?';
        return { text, spokenText: text, language: 'en-IN' };
      }
      if (contextType === 'kitchen' && cleanName) {
        const text = `Welcome to ${cleanName}! What would you like to order today? Tap the mic and let me know.`;
        return { text, spokenText: text, language: 'en-IN' };
      }
      if (contextType === 'general_returning') {
        const text = 'Welcome back to OrderBhojan! Tap the microphone and tell me what homestyle meal you are craving today.';
        return { text, spokenText: text, language: 'en-IN' };
      }
      const text = 'Welcome to OrderBhojan! Tap the microphone and tell me what you would like to eat — I will help you discover and order homestyle food.';
      return { text, spokenText: text, language: 'en-IN' };
    }
  }
}
