import fs from 'fs';

const imagePath = 'f:/Manaintibojanam_final2/public/app_icon_new.png';
const imageData = fs.readFileSync(imagePath).toString('base64');
const base64Image = `data:image/png;base64,${imageData}`;

// This SVG is strictly text-less. It serves exclusively as the symbolic identity.
const svgContent = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Premium Dark Charcoal Background -->
  <rect width="1024" height="1024" fill="#0C0C0C" />
  
  <!-- Subtle inner shadow to give depth to the icon container -->
  <defs>
    <filter id="innerGlow">
      <feDropShadow dx="0" dy="0" stdDeviation="40" flood-color="#EADCA6" flood-opacity="0.05" />
    </filter>
  </defs>
  
  <!-- The Emblem: perfectly centered and scaled to respect safe zones -->
  <!-- We zoom it in slightly to maximize the coin visibility while maintaining safe margins -->
  <g filter="url(#innerGlow)">
    <image href="${base64Image}" x="-50" y="-50" width="1124" height="1124" />
  </g>
</svg>
`;

fs.writeFileSync('f:/Manaintibojanam_final2/public/logo-v14-emblem.svg', svgContent);
fs.copyFileSync('f:/Manaintibojanam_final2/public/app_icon_new.png', 'f:/Manaintibojanam_final2/public/icon-v14-192.png');
fs.copyFileSync('f:/Manaintibojanam_final2/public/app_icon_new.png', 'f:/Manaintibojanam_final2/public/icon-v14-512.png');

console.log('Successfully generated v14 text-less emblem.');
