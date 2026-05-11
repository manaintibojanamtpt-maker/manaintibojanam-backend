import fs from 'fs';

const imagePath = 'f:/Manaintibojanam_final2/public/app_icon_new.png';
const imageData = fs.readFileSync(imagePath).toString('base64');
const base64Image = `data:image/png;base64,${imageData}`;

const svgContent = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Premium Dark Background with subtle radial glow -->
  <defs>
    <radialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1f1f1f"/>
      <stop offset="100%" stop-color="#050505"/>
    </radialGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="10" stdDeviation="15" flood-color="#000" flood-opacity="0.8"/>
    </filter>
  </defs>

  <rect width="1024" height="1024" fill="url(#bgGradient)" />
  
  <!-- Emblem: Zoomed in to remove padding, shifted up for text room -->
  <!-- This makes the gold coin large and prominent -->
  <g filter="url(#shadow)">
    <image href="${base64Image}" x="-50" y="-150" width="1124" height="1124" />
  </g>

  <!-- Gradient overlay at bottom to ensure text readability -->
  <rect x="0" y="650" width="1024" height="374" fill="#050505" opacity="0.6" />

  <!-- High Visibility Brand Text Baked Into the Image -->
  <text x="512" y="830" text-anchor="middle" fill="#EADCA6" font-family="'Playfair Display', serif" font-weight="900" font-size="76" letter-spacing="4" style="text-transform: uppercase; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.9));">
    Mana Inti Bojanam
  </text>
  
  <text x="512" y="900" text-anchor="middle" fill="#C5A059" font-family="'Inter', sans-serif" font-weight="600" font-size="26" letter-spacing="14" style="text-transform: uppercase; opacity: 0.9;">
    Authentic &amp; Traditional
  </text>
</svg>
`;

fs.writeFileSync('f:/Manaintibojanam_final2/public/logo-v15-branded.svg', svgContent);
fs.copyFileSync('f:/Manaintibojanam_final2/public/app_icon_new.png', 'f:/Manaintibojanam_final2/public/icon-v15-192.png');
fs.copyFileSync('f:/Manaintibojanam_final2/public/app_icon_new.png', 'f:/Manaintibojanam_final2/public/icon-v15-512.png');

console.log('Generated v15 with highly visible baked-in text.');
