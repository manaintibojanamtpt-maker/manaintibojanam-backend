import fs from 'fs';

// Use the pristine, unbranded image
const imagePath = 'f:/Manaintibojanam_final2/public/app_icon_new.png';
const imageData = fs.readFileSync(imagePath).toString('base64');
const base64Image = `data:image/png;base64,${imageData}`;

const svgContent = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Background (Dark Premium Charcoal) -->
  <rect width="1024" height="1024" fill="#0A0A0A" />
  
  <!-- Zoom in to remove padding from the base image -->
  <image href="${base64Image}" x="-138" y="-200" width="1300" height="1300" />
  
  <!-- Gradient Overlay for better text contrast -->
  <defs>
    <linearGradient id="textGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0A0A0A" stop-opacity="0" />
      <stop offset="100%" stop-color="#0A0A0A" stop-opacity="1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect x="0" y="700" width="1024" height="324" fill="url(#textGrad)" />

  <!-- Add Text cleanly -->
  <text x="512" y="880" text-anchor="middle" fill="#FFD700" font-family="serif" font-weight="900" font-size="80" letter-spacing="2" filter="url(#glow)" style="text-transform: uppercase;">
    Mana Inti Bojanam
  </text>
  <text x="512" y="940" text-anchor="middle" fill="#FFD700" font-family="sans-serif" font-weight="700" font-size="28" letter-spacing="12" opacity="0.9" style="text-transform: uppercase;">
    Authentic &amp; Traditional
  </text>
</svg>
`;

fs.writeFileSync('f:/Manaintibojanam_final2/public/logo-v11-branded.svg', svgContent);
fs.copyFileSync('f:/Manaintibojanam_final2/public/app_icon_new.png', 'f:/Manaintibojanam_final2/public/icon-v11-192.png'); // Fallback icons
fs.copyFileSync('f:/Manaintibojanam_final2/public/app_icon_new.png', 'f:/Manaintibojanam_final2/public/icon-v11-512.png'); // Fallback icons
console.log('Successfully generated v11 SVG and fallbacks.');
