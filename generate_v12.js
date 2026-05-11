import fs from 'fs';

const imagePath = 'f:/Manaintibojanam_final2/public/app_icon_new.png';
const imageData = fs.readFileSync(imagePath).toString('base64');
const base64Image = `data:image/png;base64,${imageData}`;

const svgContent = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1024" height="1024" fill="#0A0A0A" />
  
  <!-- Emblem: Zoomed in slightly to remove some padding, and shifted UP -->
  <!-- This centers the emblem in the upper portion, leaving room for text below -->
  <image href="${base64Image}" x="-50" y="-150" width="1124" height="1124" />
  
  <!-- Subtle gradient at the bottom to ensure text readability -->
  <defs>
    <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0A0A0A" stop-opacity="0" />
      <stop offset="100%" stop-color="#0A0A0A" stop-opacity="1" />
    </linearGradient>
  </defs>
  <rect x="0" y="600" width="1024" height="424" fill="url(#bottomFade)" />

  <!-- Premium Typography -->
  <!-- Clean, un-cluttered text placed safely inside the inner circle radius -->
  <text x="512" y="820" text-anchor="middle" fill="#EADCA6" font-family="serif" font-weight="900" font-size="64" letter-spacing="6" style="text-transform: uppercase; filter: drop-shadow(0px 4px 10px rgba(0,0,0,0.9));">
    Mana Inti Bojanam
  </text>
  
  <text x="512" y="890" text-anchor="middle" fill="#EADCA6" font-family="sans-serif" font-weight="600" font-size="22" letter-spacing="12" opacity="0.75" style="text-transform: uppercase;">
    Authentic &amp; Traditional
  </text>
</svg>
`;

fs.writeFileSync('f:/Manaintibojanam_final2/public/logo-v12-branded.svg', svgContent);
console.log('Successfully generated v12 clean SVG.');
