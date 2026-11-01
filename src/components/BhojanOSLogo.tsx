import React, { memo } from 'react';

/**
 * BhojanOS Premium Animated Logo —
 * Geometric flame & hearth emblem with ambient glow,
 * specular reflection, and warm saffron-amber gradient.
 */
const BhojanOSLogo = memo(function BhojanOSLogo({
  size = 36,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none transition-transform duration-300 hover:scale-105 ${className}`}
      aria-label="BhojanOS Emblem"
      role="img"
    >
      <defs>
        {/* Core Saffron Gradient */}
        <linearGradient id="bhos-flame-grad" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        {/* Ambient Dark Charcoal Bezel Gradient */}
        <linearGradient id="bhos-bezel-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E2028" />
          <stop offset="100%" stopColor="#0B0C10" />
        </linearGradient>

        {/* Shimmer Line Gradient */}
        <linearGradient id="bhos-shimmer" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* Radiant Inner Glow */}
        <radialGradient id="bhos-core-glow" cx="24" cy="22" r="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(245, 158, 11, 0.35)" />
          <stop offset="100%" stopColor="rgba(217, 119, 6, 0)" />
        </radialGradient>

        {/* Drop Shadow Filter */}
        <filter id="bhos-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="rgba(217, 119, 6, 0.35)" />
        </filter>
      </defs>

      {/* Outer Premium Bezel */}
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="12"
        fill="url(#bhos-bezel-grad)"
        stroke="rgba(217, 119, 6, 0.3)"
        strokeWidth="1.2"
      />

      {/* Internal Radial Glow */}
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="11"
        fill="url(#bhos-core-glow)"
      />

      {/* Specular Diagonal Reflection */}
      <path
        d="M6 16 L28 4 L34 4 L8 22 Z"
        fill="white"
        opacity="0.08"
      />

      {/* Stylized Modern "B" + Hearth / Flame Architecture */}
      <g filter="url(#bhos-glow-filter)">
        {/* Left Sovereign Backbone */}
        <path
          d="M13 13 C13 11.8954 13.8954 11 15 11 H19 C20.1046 11 21 11.8954 21 13 V35 C21 36.1046 20.1046 37 19 37 H15 C13.8954 37 13 36.1046 13 35 Z"
          fill="url(#bhos-flame-grad)"
        />

        {/* Upper Kitchen Loop */}
        <path
          d="M21 11 H28 C32.4183 11 36 14.5817 36 19 C36 23.4183 32.4183 27 28 27 H21 V11 Z"
          fill="url(#bhos-flame-grad)"
          opacity="0.95"
        />

        {/* Lower Logistics Loop */}
        <path
          d="M21 23 H29 C33.4183 23 37 26.5817 37 31 C37 35.4183 33.4183 39 29 39 H21 V23 Z"
          fill="url(#bhos-flame-grad)"
        />

        {/* Cutouts for negative space / modern typography punch */}
        <circle cx="27" cy="19" r="3.2" fill="#13151D" />
        <circle cx="28" cy="31" r="3.4" fill="#0E1016" />

        {/* Center Golden Spark / Flame Tip */}
        <circle cx="28" cy="23" r="1.5" fill="#FEF3C7">
          <animate
            attributeName="opacity"
            values="0.4;1;0.4"
            dur="2.5s"
            repeatCount="indefinite"
          />
        </circle>
      </g>

      {/* Animated Subtle Shimmer Sweep */}
      <line x1="4" y1="44" x2="44" y2="4" stroke="url(#bhos-shimmer)" strokeWidth="1.5">
        <animate
          attributeName="opacity"
          values="0;0.5;0"
          dur="3.5s"
          repeatCount="indefinite"
        />
      </line>
    </svg>
  );
});

export default BhojanOSLogo;
export { BhojanOSLogo };
