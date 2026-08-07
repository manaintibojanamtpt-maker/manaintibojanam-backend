/**
 * Purpose: Localize short workflow system replies for voice ordering.
 * Public API: localizeWorkflowReply, primaryLang
 */

export function primaryLang(locale?: string): string {
  return (locale ?? 'en').trim().toLowerCase().split(/[-_]/)[0] || 'en';
}

const TE: Record<string, string> = {
  greet: 'నమస్కారం! మీరు ఏమి ఆర్డర్ చేయాలనుకుంటున్నారు?',
  add_item: 'CART_ADD', // special
  checkout: 'సరే, చెక్‌అవుట్‌కి వెళ్తున్నాం.',
  cancel: 'సరే, రద్దు చేశాను.',
  confirmed: 'నిర్ధారించబడింది.',
  cancelled: 'సరే, రద్దు చేశాను.',
  ok: 'సరే.',
  missing_food: 'ఏ ఐటమ్ జోడించాలి?',
  missing_address: 'డెలివరీ అడ్రస్ చెప్పండి.',
  missing_schedule: 'ఎప్పుడు డెలివరీ కావాలి — ఇప్పుడే, లేదా సమయం చెప్పండి (ఉదా. 8 PM)?',
  ambiguous_schedule: 'ఏ సమయం కావాలో స్పష్టంగా చెప్పండి — ఇప్పుడే, 8 PM, లేదా రేపు lunch.',
  invalid_schedule: 'ఆ సమయం అందుబాటులో లేదు. ఇప్పుడే లేదా మరో స్లాట్ చెప్పండి.',
  schedule_horizon: 'ఈరోజు లేదా రేపు మాత్రమే షెడ్యూల్ చేయవచ్చు — ఉదా. రేపు 8 PM చెప్పండి.',
  schedule_asap: 'సరే — వీలైనంత త్వరగా డెలివరీ.',
  schedule_set: 'SCHEDULE_SET',
  unknown: 'అర్థం కాలేదు. ఐటమ్ జోడించండి, చెక్‌అవుట్, లేదా రద్దు చేయండి.',
  clarify: 'దయచేసి మరోసారి స్పష్టంగా చెప్పండి.',
  empty_cart: 'కార్ట్ ఖాళీగా ఉంది. ముందుగా ఏదైనా జోడించండి.',
  deny: 'ఇప్పుడు అది చేయలేను.',
};

const HI: Record<string, string> = {
  greet: 'नमस्ते! आप क्या ऑर्डर करना चाहेंगे?',
  add_item: 'CART_ADD',
  checkout: 'ठीक है, चेकआउट पर चलते हैं।',
  cancel: 'ठीक है, रद्द कर दिया।',
  confirmed: 'पुष्टि हो गई।',
  cancelled: 'ठीक है, रद्द किया।',
  ok: 'ठीक है।',
  missing_food: 'कौन सा आइटम जोड़ना है?',
  missing_address: 'डिलीवरी पता बताएं।',
  missing_schedule: 'डिलीवरी कब चाहिए — अभी, या समय बताएं (जैसे 8 PM)?',
  ambiguous_schedule: 'कृपया साफ़ समय बताएं — अभी, 8 PM, या कल lunch.',
  invalid_schedule: 'वह समय उपलब्ध नहीं है। अभी या कोई और स्लॉट बताएं।',
  schedule_horizon: 'आज या कल ही शेड्यूल कर सकते हैं — जैसे कल 8 PM बोलें।',
  schedule_asap: 'ठीक है — जितनी जल्दी हो सके डिलीवरी।',
  schedule_set: 'SCHEDULE_SET',
  unknown: 'समझ नहीं आया। आइटम जोड़ें, चेकआउट, या रद्द करें।',
  clarify: 'कृपया थोड़ा और स्पष्ट कहें।',
  empty_cart: 'कार्ट खाली है। पहले कुछ जोड़ें।',
  deny: 'अभी यह नहीं कर सकता।',
};

function pack(lang: string): Record<string, string> | null {
  if (lang === 'te') return TE;
  if (lang === 'hi') return HI;
  return null;
}

export function localizeWorkflowReply(
  key: keyof typeof TE,
  locale: string | undefined,
  vars?: { quantity?: number; name?: string; slot?: string },
): string {
  const lang = primaryLang(locale);
  const table = pack(lang);
  if (!table) {
    // English defaults
    switch (key) {
      case 'greet':
        return 'Hello! What would you like to order?';
      case 'add_item':
        return `Ready: ${vars?.quantity ?? 1} × ${vars?.name ?? 'that item'}. Say confirm to add to cart.`;
      case 'checkout':
        return 'Alright, proceeding to checkout.';
      case 'cancel':
        return 'Okay, I cancelled that.';
      case 'confirmed':
        return 'Confirmed.';
      case 'cancelled':
        return 'Okay, cancelled.';
      case 'ok':
        return 'Okay.';
      case 'missing_food':
        return 'Which item would you like to add?';
      case 'missing_address':
        return 'Please share your delivery address to continue checkout.';
      case 'missing_schedule':
        return 'When should we deliver — now, or a time like 8 PM / tomorrow lunch?';
      case 'ambiguous_schedule':
        return 'Please say a clear time — now, 8 PM, or tomorrow lunch.';
      case 'invalid_schedule':
        return 'That time isn’t available. Try now, or pick another slot.';
      case 'schedule_horizon':
        return 'We can schedule Today or Tomorrow — say a time like tomorrow 8 PM.';
      case 'schedule_asap':
        return 'Okay — delivering as soon as possible.';
      case 'schedule_set':
        return `Okay — scheduled for ${vars?.slot ?? 'that time'}.`;
      case 'unknown':
        return "Sorry, I didn't catch that. You can add an item, checkout, or cancel.";
      case 'clarify':
        return 'Could you clarify that for me?';
      case 'empty_cart':
        return 'Your cart is empty. Add something before checkout.';
      case 'deny':
        return 'I cannot do that right now.';
      default:
        return 'Okay.';
    }
  }

  if (key === 'add_item') {
    const q = vars?.quantity ?? 1;
    const n = vars?.name ?? (lang === 'te' ? 'ఆ ఐటమ్' : 'वो आइटम');
    if (lang === 'te') {
      return `సిద్ధం: ${q} × ${n}. కార్ట్‌లో జోడించాలంటే "confirm" అనండి.`;
    }
    return `तैयार: ${q} × ${n}. कार्ट में जोड़ने के लिए "confirm" बोलें।`;
  }

  if (key === 'schedule_set') {
    const slot = vars?.slot ?? (lang === 'te' ? 'ఆ సమయం' : 'उस समय');
    if (lang === 'te') return `సరే — ${slot} కి షెడ్యూల్ చేశాను.`;
    return `ठीक है — ${slot} के लिए शेड्यूल किया।`;
  }

  return table[key] ?? table.ok;
}
