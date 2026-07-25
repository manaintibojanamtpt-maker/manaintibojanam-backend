import React from 'react';
import { MessageCircle } from 'lucide-react';
import { SUPPORT_PHONE_DISPLAY, SUPPORT_WHATSAPP_URL } from '../../config/support';

const PREFILL =
  'Hi BhojanOS support — I need help with a technical or onboarding question.';

/**
 * Always-on WhatsApp CTA for immediate human support on the marketing site.
 * Sits bottom-left so it does not collide with the AI assistant (bottom-right).
 */
export function MarketingWhatsAppFloat() {
  const href = `${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(PREFILL)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 left-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_40px_-12px_rgba(37,211,102,0.65)] transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/70 sm:bottom-6 sm:left-6"
      aria-label={`Chat on WhatsApp (${SUPPORT_PHONE_DISPLAY})`}
      title={`WhatsApp support · ${SUPPORT_PHONE_DISPLAY}`}
      data-testid="marketing-whatsapp-float"
    >
      <MessageCircle size={22} strokeWidth={2.25} />
    </a>
  );
}

export default MarketingWhatsAppFloat;
