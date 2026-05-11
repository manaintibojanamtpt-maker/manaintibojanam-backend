import fs from 'fs';

// The perfect screenshot taken previously by Puppeteer, containing the gold coin AND perfect web fonts!
const perfectImagePath = 'C:/Users/viswa/.gemini/antigravity/brain/88ef4d99-8efc-47ca-b547-8e52b775b263/mana_inti_bojanam_app_icon_final_v2_1024x1024_1778410462468.png';
const destPath = 'f:/Manaintibojanam_final2/public/logo-v16-perfect.png';

fs.copyFileSync(perfectImagePath, destPath);
fs.copyFileSync(perfectImagePath, 'f:/Manaintibojanam_final2/public/icon-v16-192.png');
fs.copyFileSync(perfectImagePath, 'f:/Manaintibojanam_final2/public/icon-v16-512.png');

// 1. Update index.html
const indexPath = 'f:/Manaintibojanam_final2/index.html';
let indexContent = fs.readFileSync(indexPath, 'utf8');

// The new splash screen should just use the perfect PNG
const newSplashHTML = `
    <!-- Premium Splash Screen with PERFECT PNG Logo -->
    <div id="initial-loader" style="position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: radial-gradient(circle at center, #1f1f1f 0%, #0a0a0a 80%); z-index: 9999; padding-bottom: env(safe-area-inset-bottom);">
      <img src="/logo-v16-perfect.png" alt="Mana Inti Bojanam Logo" style="width: 75vw; max-width: 350px; height: auto; animation: pulseEmblem 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; filter: drop-shadow(0 15px 30px rgba(0,0,0,0.9));" />
    </div>
`;

// Replace the old loader logic
indexContent = indexContent.replace(/<!-- Premium Splash Screen[\s\S]*?<\/div>\s*<\/div>/, newSplashHTML);
indexContent = indexContent.replace(/\/icon-v15-/g, '/icon-v16-');
indexContent = indexContent.replace(/\/logo-v15-branded\.svg/g, '/logo-v16-perfect.png');
indexContent = indexContent.replace(/\?v=15/g, '?v=16');
fs.writeFileSync(indexPath, indexContent);

// 2. Update manifest.json
const manifestPath = 'f:/Manaintibojanam_final2/public/manifest.json';
let manifestContent = fs.readFileSync(manifestPath, 'utf8');
manifestContent = manifestContent.replace(/\/icon-v15-/g, '/icon-v16-');
manifestContent = manifestContent.replace(/\/logo-v15-branded\.svg/g, '/logo-v16-perfect.png');
// We need to update the type to image/png for the logo
manifestContent = manifestContent.replace(/"type": "image\/svg\+xml"/g, '"type": "image/png"');
fs.writeFileSync(manifestPath, manifestContent);

// 3. Update React Files
const reactFiles = [
  'f:/Manaintibojanam_final2/src/pages/AdminLogin.tsx',
  'f:/Manaintibojanam_final2/src/pages/Home.tsx',
  'f:/Manaintibojanam_final2/src/App.tsx',
  'f:/Manaintibojanam_final2/src/pages/Login.tsx'
];

for (const file of reactFiles) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\/logo-v15-branded\.svg/g, '/logo-v16-perfect.png');
  fs.writeFileSync(file, content);
}

console.log('Successfully updated everything to use the PERFECT v16 PNG!');
