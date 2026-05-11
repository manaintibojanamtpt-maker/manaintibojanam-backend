import fs from 'fs';

const imagePath = 'f:/Manaintibojanam_final2/public/app_icon_new.png';
const imageData = fs.readFileSync(imagePath).toString('base64');
const base64Image = `data:image/png;base64,${imageData}`;

const svgContent = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Mask to perfectly blend the textured edges of the gold coin image into the solid background -->
    <!-- Center is solid white (fully visible), edges fade to transparent -->
    <radialGradient id="fadeMaskGrad" cx="50%" cy="50%" r="50%">
      <stop offset="65%" stop-color="white" stop-opacity="1" />
      <stop offset="100%" stop-color="white" stop-opacity="0" />
    </radialGradient>
    <mask id="fadeMask">
      <!-- We align the mask with the image coordinates to fade the image properly -->
      <circle cx="512" cy="430" r="400" fill="url(#fadeMaskGrad)" />
    </mask>
  </defs>

  <!-- 1. Full Solid Background. Matches web app #0C0C0C exactly. No clipping, no squircles! -->
  <rect width="1024" height="1024" fill="#0C0C0C" />

  <!-- 2. The Gold Coin Image. Shifted up, blended seamlessly -->
  <image href="${base64Image}" x="112" y="30" width="800" height="800" mask="url(#fadeMask)" />

  <!-- 3. Perfect Typography. Safely bounded within 850px to NEVER get chopped. -->
  <text x="512" y="860" text-anchor="middle" fill="#EADCA6" font-family="'Times New Roman', Georgia, serif" font-weight="900" font-size="70" textLength="850" lengthAdjust="spacing" style="text-transform: uppercase;">
    Mana Inti Bojanam
  </text>
  
  <text x="512" y="940" text-anchor="middle" fill="#C5A059" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="28" textLength="450" lengthAdjust="spacing" style="text-transform: uppercase; letter-spacing: 4px;">
    Authentic &amp; Traditional
  </text>
</svg>
`;

fs.writeFileSync('f:/Manaintibojanam_final2/public/logo-v18-flawless.svg', svgContent);
fs.copyFileSync('f:/Manaintibojanam_final2/public/app_icon_new.png', 'f:/Manaintibojanam_final2/public/icon-v18-192.png');
fs.copyFileSync('f:/Manaintibojanam_final2/public/app_icon_new.png', 'f:/Manaintibojanam_final2/public/icon-v18-512.png');

console.log('Successfully generated v18 flawless seamless SVG.');
