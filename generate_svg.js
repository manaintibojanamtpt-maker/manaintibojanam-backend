import fs from 'fs';

// Use the branded screenshot
const imagePath = 'C:/Users/viswa/.gemini/antigravity/brain/88ef4d99-8efc-47ca-b547-8e52b775b263/mana_inti_bojanam_app_icon_final_v2_1024x1024_1778410462468.png';
const imageData = fs.readFileSync(imagePath).toString('base64');
const base64Image = `data:image/png;base64,${imageData}`;

const svgContent = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="black" />
  <image href="${base64Image}" x="0" y="95" width="1024" height="834" />
  <text x="512" y="820" text-anchor="middle" fill="#FFD700" font-family="serif" font-weight="900" font-size="80" letter-spacing="4" style="text-transform: uppercase;">
    Mana Inti Bojanam
  </text>
</svg>
`;

// Write to NEW filename to bust all possible caches
fs.writeFileSync('f:/Manaintibojanam_final2/public/logo-v10-branded.svg', svgContent);

// Copy the branded PNG to NEW filenames
fs.copyFileSync(imagePath, 'f:/Manaintibojanam_final2/public/icon-v10-192.png');
fs.copyFileSync(imagePath, 'f:/Manaintibojanam_final2/public/icon-v10-512.png');

console.log('Successfully generated v10 branded icons with new filenames.');
