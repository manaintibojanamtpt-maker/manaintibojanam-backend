import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Fixed enterprise header height + safe area */
export const MARKETING_HEADER_OFFSET = 96;

export function scrollToMarketingSection(id: string, behavior: ScrollBehavior = 'smooth'): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  const top = el.getBoundingClientRect().top + window.scrollY - MARKETING_HEADER_OFFSET;
  window.scrollTo({ top: Math.max(0, top), behavior });
  return true;
}

/**
 * Scrolls to hash targets on marketing pages after route/navigation changes.
 * Retries briefly so lazy sections and animations can mount first.
 */
export function useMarketingHashScroll(enabled = true) {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!enabled || !hash) return;

    const id = hash.replace('#', '');
    if (!id) return;

    let attempts = 0;
    let cancelled = false;

    const tryScroll = () => {
      if (cancelled) return;
      if (scrollToMarketingSection(id) || attempts >= 12) return;
      attempts += 1;
      window.setTimeout(tryScroll, 80);
    };

    const timer = window.setTimeout(tryScroll, 50);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname, hash, enabled]);
}
