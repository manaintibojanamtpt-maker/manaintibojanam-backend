import { useEffect, useRef } from 'react';

/**
 * Adds `is-visible` class to elements when they enter the viewport.
 * Used for scroll-based reveal animations. Respects prefers-reduced-motion
 * by immediately showing all elements.
 */
export function useScrollReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.querySelectorAll('.cine-reveal').forEach((node) => {
        node.classList.add('is-visible');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    el.querySelectorAll('.cine-reveal').forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return ref;
}
