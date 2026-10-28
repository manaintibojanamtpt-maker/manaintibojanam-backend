import React, { memo } from 'react';

/**
 * BhojanOS Logo — isometric stacked "B" with glassmorphism,
 * saffron-amber top layer and emerald bottom rim.
 * Inspired by modular grid + thali geometry.
 */
const BhojanOSLogo = memo(function BhojanOSLogo({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const s = size;
  const h = s;
  const w = s * 0.82;
  const cx = w / 2;
  const cy = h / 2;

  return (
    <svg
      width={s}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      aria-label="BhojanOS Logo"
      role="img"
    >
      <defs>
        <linearGradient id="bhos-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0B860" />
          <stop offset="50%" stopColor="#D9852F" />
          <stop offset="100%" stopColor="#C07020" />
        </linearGradient>
        <linearGradient id="bhos-mid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(232,169,94,0.85)" />
          <stop offset="100%" stopColor="rgba(217,133,47,0.65)" />
        </linearGradient>
        <linearGradient id="bhos-bot" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <radialGradient id="bhos-glow" cx="30%" cy="25%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id="bhos-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.6)" />
        </filter>
      </defs>

      <g filter="url(#bhos-shadow)">
        {/* Left stem */}
        <rect
          x={w * 0.08}
          y={h * 0.12}
          width={w * 0.28}
          height={h * 0.76}
          rx={s * 0.06}
          fill="url(#bhos-mid)"
          stroke="rgba(232,169,94,0.5)"
          strokeWidth={0.8}
        />
        {/* Top loop */}
        <rect
          x={w * 0.28}
          y={h * 0.1}
          width={w * 0.44}
          height={h * 0.38}
          rx={s * 0.08}
          fill="url(#bhos-top)"
          stroke="rgba(240,184,96,0.7)"
          strokeWidth={0.8}
        />
        {/* Bottom loop */}
        <rect
          x={w * 0.28}
          y={h * 0.48}
          width={w * 0.44}
          height={h * 0.42}
          rx={s * 0.08}
          fill="url(#bhos-bot)"
          stroke="rgba(52,211,153,0.6)"
          strokeWidth={0.8}
        />
      </g>

      {/* Glass highlight */}
      <rect
        x={w * 0.08}
        y={h * 0.1}
        width={w * 0.64}
        height={h * 0.36}
        rx={s * 0.08}
        fill="url(#bhos-glow)"
        pointerEvents="none"
      />

      {/* Terminal dots */}
      <circle cx={w * 0.14} cy={h * 0.18} r={s * 0.025} fill="rgba(255,255,255,0.6)" />
      <circle cx={w * 0.2} cy={h * 0.18} r={s * 0.025} fill="rgba(255,255,255,0.4)" />
      <circle cx={w * 0.26} cy={h * 0.18} r={s * 0.025} fill="rgba(255,255,255,0.25)" />

      {/* Subtle thali ring hint */}
      <circle
        cx={w * 0.55}
        cy={h * 0.68}
        r={s * 0.14}
        fill="none"
        stroke="rgba(52,211,153,0.25)"
        strokeWidth={0.8}
        strokeDasharray="3 3"
      />
      <circle
        cx={w * 0.55}
        cy={h * 0.68}
        r={s * 0.08}
        fill="rgba(52,211,153,0.1)"
        stroke="rgba(52,211,153,0.3)"
        strokeWidth={0.5}
      />
    </svg>
  );
});

export default BhojanOSLogo;
export { BhojanOSLogo };
