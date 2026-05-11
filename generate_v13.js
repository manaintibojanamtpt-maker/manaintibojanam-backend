import fs from 'fs';

const imagePath = 'f:/Manaintibojanam_final2/public/app_icon_new.png';
const imageData = fs.readFileSync(imagePath).toString('base64');
const base64Image = `data:image/png;base64,${imageData}`;

const svgContent = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Background with subtle spotlight effect to match the premium mockup -->
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="40%">
      <stop offset="0%" stop-color="#1f1f1f" />
      <stop offset="100%" stop-color="#050505" />
    </radialGradient>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.8"/>
    </filter>
    <filter id="textShadow">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.9"/>
    </filter>
  </defs>
  
  <rect width="1024" height="1024" fill="url(#bgGlow)" />
  
  <!-- Emblem: Scaled down significantly and centered in the upper portion -->
  <!-- Original is 1024x1024. We render at 760x760 to make the gold coin smaller -->
  <!-- X: (1024 - 760)/2 = 132 -->
  <!-- Y: Center is at 420, so 420 - 380 = 40 -->
  <g filter="url(#dropShadow)">
    <image href="${base64Image}" x="132" y="30" width="760" height="760" />
  </g>

  <!-- Premium Typography matching the user's mockup -->
  <text x="512" y="790" text-anchor="middle" fill="#F4E3A4" font-family="'Playfair Display', Georgia, serif" font-weight="900" font-size="58" letter-spacing="8" filter="url(#textShadow)" style="text-transform: uppercase;">
    Mana Inti Bojanam
  </text>
  
  <text x="512" y="850" text-anchor="middle" fill="#C5A059" font-family="'Inter', Arial, sans-serif" font-weight="600" font-size="20" letter-spacing="16" filter="url(#textShadow)" style="text-transform: uppercase;">
    Authentic &amp; Traditional
  </text>
</svg>
`;

fs.writeFileSync('f:/Manaintibojanam_final2/public/logo-v13-branded.svg', svgContent);

// Fallbacks
fs.copyFileSync('f:/Manaintibojanam_final2/public/app_icon_new.png', 'f:/Manaintibojanam_final2/public/icon-v13-192.png');
fs.copyFileSync('f:/Manaintibojanam_final2/public/app_icon_new.png', 'f:/Manaintibojanam_final2/public/icon-v13-512.png');

console.log('Successfully generated v13 perfect SVG layout.');
