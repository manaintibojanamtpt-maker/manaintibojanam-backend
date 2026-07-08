export const durations = {
  instant: 0,
  fast: 120,
  normal: 200,
  slow: 320,
  slower: 480,
  page: 360,
} as const;

export const easings = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  decelerate: 'cubic-bezier(0, 0, 0, 1)',
  accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export const animation = {
  durations,
  easings,
  transition: {
    colors: `color ${durations.normal}ms ${easings.standard}, background-color ${durations.normal}ms ${easings.standard}, border-color ${durations.normal}ms ${easings.standard}`,
    transform: `transform ${durations.normal}ms ${easings.emphasized}`,
    opacity: `opacity ${durations.fast}ms ${easings.standard}`,
    all: `all ${durations.normal}ms ${easings.standard}`,
  },
} as const;

export const motionPresets = {
  fadeIn: { from: { opacity: 0 }, to: { opacity: 1 }, duration: durations.normal },
  slideUp: { from: { transform: 'translateY(12px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 }, duration: durations.slow },
  scaleIn: { from: { transform: 'scale(0.96)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 }, duration: durations.normal },
  skeletonPulse: { duration: 1200, easing: 'ease-in-out' },
} as const;
