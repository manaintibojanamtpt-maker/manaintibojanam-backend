import fs from 'fs';

const imagePath = 'f:/Manaintibojanam_final2/public/app_icon_new.png';
const imageData = fs.readFileSync(imagePath).toString('base64');
const base64Image = `data:image/png;base64,${imageData}`;

const svgContent = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Solid App Icon Background (Squircle) -->
  <rect width="1024" height="1024" fill="#0C0C0C" rx="200" />
  
  <!-- Subtle inner glow to make it look premium -->
  <rect width="1016" height="1016" x="4" y="4" fill="transparent" stroke="#2A2A2A" stroke-width="4" rx="196" />

  <!-- Emblem (Gold Coin) -->
  <!-- Centered horizontally (1024 - 800)/2 = 112, pushed up slightly to leave room for text -->
  <image href="${base64Image}" x="112" y="40" width="800" height="800" />

  <!-- Typography -->
  <!-- We use textLength to GUARANTEE it fits perfectly without clipping, even if custom fonts fail to load in the img tag -->
  <text x="512" y="850" text-anchor="middle" fill="#EADCA6" font-family="'Times New Roman', Georgia, serif" font-weight="900" font-size="64" textLength="800" lengthAdjust="spacing" style="text-transform: uppercase;">
    Mana Inti Bojanam
  </text>
  
  <text x="512" y="920" text-anchor="middle" fill="#C5A059" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="28" textLength="500" lengthAdjust="spacing" style="text-transform: uppercase; opacity: 0.9;">
    Authentic &amp; Traditional
  </text>
</svg>
`;

fs.writeFileSync('f:/Manaintibojanam_final2/public/logo-v17-perfect.svg', svgContent);
fs.copyFileSync('f:/Manaintibojanam_final2/public/app_icon_new.png', 'f:/Manaintibojanam_final2/public/icon-v17-192.png');
fs.copyFileSync('f:/Manaintibojanam_final2/public/app_icon_new.png', 'f:/Manaintibojanam_final2/public/icon-v17-512.png');

console.log('Successfully generated v17 foolproof SVG.');
