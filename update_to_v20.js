import fs from 'fs';
import path from 'path';

// Let's specifically grab the 3MB image which is the detailed banner logo, NOT the smaller circular one.
const dir = 'C:/Users/viswa/.gemini/antigravity/brain/88ef4d99-8efc-47ca-b547-8e52b775b263/.tempmediaStorage';
const correctImageFile = 'media_88ef4d99-8efc-47ca-b547-8e52b775b263_1778417178119.png';
const srcPath = path.join(dir, correctImageFile);

console.log('Copying the correct detailed banner logo...');

// 2. Copy it to public folder
fs.copyFileSync(srcPath, 'f:/Manaintibojanam_final2/public/logo-v20-final.png');
fs.copyFileSync(srcPath, 'f:/Manaintibojanam_final2/public/icon-v20-192.png');
fs.copyFileSync(srcPath, 'f:/Manaintibojanam_final2/public/icon-v20-512.png');
console.log('Copied to public folder.');

// 3. Update index.html
const indexPath = 'f:/Manaintibojanam_final2/index.html';
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Replace all references
indexContent = indexContent.replace(/\/icon-v19-/g, '/icon-v20-');
indexContent = indexContent.replace(/\/logo-v19-final\.png/g, '/logo-v20-final.png');
indexContent = indexContent.replace(/\?v=19/g, '?v=20');

// Make the splash screen image pure and simple
const oldSplashImage = /<img src="\/logo-v19-final\.png"[\s\S]*?\/>/;
const newSplashImage = '<img src="/logo-v20-final.png" alt="Mana Inti Bojanam Logo" style="width: 80vw; max-width: 450px; height: auto; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);" />';
indexContent = indexContent.replace(oldSplashImage, newSplashImage);

fs.writeFileSync(indexPath, indexContent);
console.log('Updated index.html');

// 4. Update manifest.json
const manifestPath = 'f:/Manaintibojanam_final2/public/manifest.json';
let manifestContent = fs.readFileSync(manifestPath, 'utf8');
manifestContent = manifestContent.replace(/\/icon-v19-/g, '/icon-v20-');
manifestContent = manifestContent.replace(/\/logo-v19-final\.png/g, '/logo-v20-final.png');
fs.writeFileSync(manifestPath, manifestContent);
console.log('Updated manifest.json');

// 5. Update React Files
const reactFiles = [
  'f:/Manaintibojanam_final2/src/pages/AdminLogin.tsx',
  'f:/Manaintibojanam_final2/src/pages/Home.tsx',
  'f:/Manaintibojanam_final2/src/App.tsx',
  'f:/Manaintibojanam_final2/src/pages/Login.tsx'
];

for (const file of reactFiles) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\/logo-v19-final\.png/g, '/logo-v20-final.png');
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}

// 6. Bump Service Worker Cache to v11
const swPath = 'f:/Manaintibojanam_final2/public/service-worker.js';
let swContent = fs.readFileSync(swPath, 'utf8');
swContent = swContent.replace(/mib-cache-v10/g, 'mib-cache-v11');
swContent = swContent.replace(/const VERSION = 'v10';/g, "const VERSION = 'v11';");
fs.writeFileSync(swPath, swContent);
console.log('Bumped service worker cache to v11');

console.log('DONE!');
