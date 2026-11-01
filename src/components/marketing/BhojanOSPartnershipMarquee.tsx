import React from "react";
import { Marquee } from "../ui/marquee";

export interface PartnerLogoItem {
  name: string;
  category: string;
  badge?: string;
  renderLogo: () => React.ReactNode;
}

export const PARTNER_COMPANIES: PartnerLogoItem[] = [
  {
    name: "Razorpay",
    category: "Payment Gateway",
    badge: "Instant Payouts",
    renderLogo: () => (
      <svg className="h-6 w-auto" viewBox="0 0 140 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 2L2 20.5H11.5L8.5 30L22 13.5H12L15.5 2H12.5Z" fill="#0C2340" />
        <path d="M14.5 2L4 20.5H13.5L10.5 30L24 13.5H14L17.5 2H14.5Z" fill="#3395FF" />
        <text x="32" y="22" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="18" letterSpacing="-0.5px">Razorpay</text>
      </svg>
    ),
  },
  {
    name: "Shadowfax",
    category: "Hyperlocal 3PL",
    badge: "API Fleet",
    renderLogo: () => (
      <svg className="h-6 w-auto" viewBox="0 0 156 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#FF5E00" />
        <path d="M10 16L15 9V14H22L17 23V18H10Z" fill="#FFFFFF" />
        <text x="38" y="22" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="17" letterSpacing="-0.3px">shadowfax</text>
      </svg>
    ),
  },
  {
    name: "PhonePe",
    category: "NPCI UPI 2.0",
    badge: "Direct Settlement",
    renderLogo: () => (
      <svg className="h-6 w-auto" viewBox="0 0 140 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="15" cy="16" r="14" fill="#6739B7" />
        <text x="10" y="22" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="18">पे</text>
        <text x="36" y="22" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="17" letterSpacing="-0.3px">PhonePe</text>
      </svg>
    ),
  },
  {
    name: "Dunzo Direct",
    category: "Express Delivery",
    badge: "15-min Dispatch",
    renderLogo: () => (
      <svg className="h-6 w-auto" viewBox="0 0 140 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="4" width="24" height="24" rx="6" fill="#00D290" />
        <path d="M9 16L14 10L19 16L14 22L9 16Z" fill="#001E2B" />
        <text x="34" y="22" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="18" letterSpacing="-0.5px">dunzo</text>
      </svg>
    ),
  },
  {
    name: "Porter",
    category: "Intracity Logistics",
    badge: "Heavy & Bulk Orders",
    renderLogo: () => (
      <svg className="h-6 w-auto" viewBox="0 0 130 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="5" width="22" height="22" rx="6" fill="#007AFF" />
        <path d="M8 11H18M8 16H15M8 21H17" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <text x="32" y="22" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="18" letterSpacing="-0.5px">porter</text>
      </svg>
    ),
  },
  {
    name: "ONDC",
    category: "Open Commerce",
    badge: "Govt Protocol",
    renderLogo: () => (
      <svg className="h-6 w-auto" viewBox="0 0 130 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="16" r="6" fill="#00AEEF" />
        <circle cx="18" cy="10" r="5" fill="#EE2A24" />
        <circle cx="18" cy="22" r="5" fill="#7AC142" />
        <text x="32" y="22" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="18" letterSpacing="0.5px">ONDC</text>
      </svg>
    ),
  },
  {
    name: "WhatsApp",
    category: "Cloud Business API",
    badge: "Bot Checkout",
    renderLogo: () => (
      <svg className="h-6 w-auto" viewBox="0 0 145 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="15" cy="16" r="13" fill="#25D366" />
        <path d="M19.5 12.5C18.3 11.3 16.7 10.6 15 10.6C11.5 10.6 8.6 13.5 8.6 17C8.6 18.2 8.9 19.3 9.5 20.3L8.5 23.5L11.8 22.5C12.7 23 13.8 23.3 15 23.3C18.5 23.3 21.4 20.4 21.4 16.9C21.4 15.2 20.7 13.7 19.5 12.5Z" fill="#FFFFFF" />
        <text x="35" y="22" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="16" letterSpacing="-0.3px">WhatsApp</text>
      </svg>
    ),
  },
  {
    name: "Google Cloud",
    category: "Cloud Infrastructure",
    badge: "99.99% Uptime",
    renderLogo: () => (
      <svg className="h-6 w-auto" viewBox="0 0 160 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 10C13 10 11.3 11 10.4 12.5C7.9 12.8 6 15 6 17.5C6 20.3 8.2 22.5 11 22.5H20C22.2 22.5 24 20.7 24 18.5C24 16.4 22.4 14.7 20.3 14.5C19.6 11.9 17.5 10 15 10Z" fill="#4285F4" />
        <text x="32" y="22" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="15" letterSpacing="-0.3px">Google Cloud</text>
      </svg>
    ),
  },
  {
    name: "Epson",
    category: "Thermal POS",
    badge: "ESC/POS Printers",
    renderLogo: () => (
      <svg className="h-6 w-auto" viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="6" width="22" height="20" rx="4" fill="#003399" />
        <path d="M7 11H19M7 16H16M7 21H19" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <text x="32" y="22" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="18" letterSpacing="0.5px">EPSON</text>
      </svg>
    ),
  },
  {
    name: "Sunmi",
    category: "Handheld Terminals",
    badge: "Smart Billing",
    renderLogo: () => (
      <svg className="h-6 w-auto" viewBox="0 0 125 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="15" cy="16" r="12" fill="#FF5000" />
        <path d="M11 16L15 12L19 16L15 20L11 16Z" fill="#FFFFFF" />
        <text x="34" y="22" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="18" letterSpacing="-0.3px">SUNMI</text>
      </svg>
    ),
  },
  {
    name: "Paytm",
    category: "Soundbox & UPI",
    badge: "Audio Confirmation",
    renderLogo: () => (
      <svg className="h-6 w-auto" viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="5" width="22" height="22" rx="6" fill="#002E6E" />
        <path d="M7 16L11 20L19 12" stroke="#00BAF2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="32" y="22" fill="#00BAF2" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="18" letterSpacing="-0.3px">Pay<tspan fill="#002E6E">tm</tspan></text>
      </svg>
    ),
  },
  {
    name: "Twilio",
    category: "SMS & OTP Gateway",
    badge: "99.9% Delivery",
    renderLogo: () => (
      <svg className="h-6 w-auto" viewBox="0 0 125 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="15" cy="16" r="12" fill="#F22F46" />
        <circle cx="12" cy="13" r="2.5" fill="#FFFFFF" />
        <circle cx="18" cy="13" r="2.5" fill="#FFFFFF" />
        <circle cx="12" cy="19" r="2.5" fill="#FFFFFF" />
        <circle cx="18" cy="19" r="2.5" fill="#FFFFFF" />
        <text x="34" y="22" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="17" letterSpacing="-0.3px">twilio</text>
      </svg>
    ),
  },
];

export function BhojanOSPartnershipMarquee({
  speed = 35,
  pauseOnHover = true,
  className = "",
}: {
  speed?: number;
  pauseOnHover?: boolean;
  className?: string;
}) {
  return (
    <div className={`w-full py-2 ${className}`}>
      <Marquee speed={speed} pauseOnHover={pauseOnHover} className="mt-0">
        {PARTNER_COMPANIES.map((company) => {
          return (
            <div
              key={company.name}
              className="flex items-center gap-3.5 px-5 py-3 rounded-2xl bg-[#141417]/80 hover:bg-[#1C1C21] border border-white/10 hover:border-[#D97706]/40 transition-all duration-300 shadow-md group shrink-0 cursor-default backdrop-blur-md"
            >
              <div className="shrink-0 transition-transform duration-300 group-hover:scale-105">
                {company.renderLogo()}
              </div>

              <div className="flex flex-col text-left pl-1 border-l border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    {company.category}
                  </span>
                  {company.badge && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#D97706]/15 text-[#F59E0B] border border-[#D97706]/20 whitespace-nowrap">
                      {company.badge}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </Marquee>
    </div>
  );
}

export default BhojanOSPartnershipMarquee;
