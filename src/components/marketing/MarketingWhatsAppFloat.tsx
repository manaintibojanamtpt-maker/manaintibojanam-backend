import React from 'react';
import { MessageCircle } from 'lucide-react';
import { SUPPORT_PHONE_DISPLAY, SUPPORT_WHATSAPP_URL } from '../../config/support';
import { triggerHaptic } from '../../utils/haptics';

const PREFILL =
  'Hi BhojanOS support — I need help with a technical or onboarding question.';

/**
 * Always-on WhatsApp CTA for immediate human support on the marketing site.
 * Sits bottom-left with notch/home safe-area clearance.
 */
export function MarketingWhatsAppFloat() {
  const href = `${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(PREFILL)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => triggerHaptic('light')}
      className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-[calc(1.25rem+env(safe-area-inset-left))] z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_40px_-12px_rgba(37,211,102,0.65)] transition hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/70 cursor-pointer"
      aria-label={`Chat on WhatsApp (${SUPPORT_PHONE_DISPLAY})`}
      title={`WhatsApp support · ${SUPPORT_PHONE_DISPLAY}`}
      data-testid="marketing-whatsapp-float"
    >
      <MessageCircle size={22} strokeWidth={2.25} />
    </a>
  );
}

export default MarketingWhatsAppFloat;
