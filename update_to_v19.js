import fs from 'fs';
import path from 'path';

// 1. Find the newest uploaded image
const dir = 'C:/Users/viswa/.gemini/antigravity/brain/88ef4d99-8efc-47ca-b547-8e52b775b263/.tempmediaStorage';
const files = fs.readdirSync(dir)
  .map(file => ({ file, mtime: fs.statSync(path.join(dir, file)).mtime }))
  .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

// We are looking for the newest .jpg or .png
const newestImage = files.find(f => f.file.endsWith('.jpg') || f.file.endsWith('.png') || f.file.endsWith('.jpeg'));

if (!newestImage) {
  console.error('No new image found!');
  process.exit(1);
}

const srcPath = path.join(dir, newestImage.file);
console.log('Found newest logo image:', newestImage.file);

// 2. Copy it to public folder
fs.copyFileSync(srcPath, 'f:/Manaintibojanam_final2/public/logo-v19-final.png');
fs.copyFileSync(srcPath, 'f:/Manaintibojanam_final2/public/icon-v19-192.png');
fs.copyFileSync(srcPath, 'f:/Manaintibojanam_final2/public/icon-v19-512.png');
console.log('Copied to public folder.');

// 3. Update index.html
const indexPath = 'f:/Manaintibojanam_final2/index.html';
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Replace all references
indexContent = indexContent.replace(/\/icon-v18-/g, '/icon-v19-');
indexContent = indexContent.replace(/\/logo-v18-flawless\.svg/g, '/logo-v19-final.png');
indexContent = indexContent.replace(/\?v=18/g, '?v=19');

// Make the splash screen image pure and simple, exactly as uploaded
const oldSplashImage = /<img src="\/logo-v18-flawless\.svg"[\s\S]*?\/>/;
const newSplashImage = '<img src="/logo-v19-final.png" alt="Mana Inti Bojanam Logo" style="width: 80vw; max-width: 400px; height: auto; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);" />';
indexContent = indexContent.replace(oldSplashImage, newSplashImage);

fs.writeFileSync(indexPath, indexContent);
console.log('Updated index.html');

// 4. Update manifest.json
const manifestPath = 'f:/Manaintibojanam_final2/public/manifest.json';
let manifestContent = fs.readFileSync(manifestPath, 'utf8');
manifestContent = manifestContent.replace(/\/icon-v18-/g, '/icon-v19-');
manifestContent = manifestContent.replace(/\/logo-v18-flawless\.svg/g, '/logo-v19-final.png');
manifestContent = manifestContent.replace(/"type": "image\/svg\+xml"/g, '"type": "image/png"'); // Update type to PNG
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
  content = content.replace(/\/logo-v18-flawless\.svg/g, '/logo-v19-final.png');
  
  // For Login.tsx, let's also remove drop-shadow and add rounded-2xl to make the square image look nice
  if (file.includes('Login.tsx')) {
    content = content.replace(/className="w-48 h-48 sm:w-56 sm:h-56 object-contain drop-shadow-\[.*?\]"/g, 'className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-2xl shadow-2xl"');
    content = content.replace(/className="w-24 h-24 object-contain drop-shadow-\[.*?\]"/g, 'className="w-24 h-24 object-contain rounded-2xl shadow-xl"');
  }
  
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}

// 6. Bump Service Worker Cache to v10
const swPath = 'f:/Manaintibojanam_final2/public/service-worker.js';
let swContent = fs.readFileSync(swPath, 'utf8');
swContent = swContent.replace(/mib-cache-v9/g, 'mib-cache-v10');
swContent = swContent.replace(/const VERSION = 'v9';/g, "const VERSION = 'v10';");
fs.writeFileSync(swPath, swContent);
console.log('Bumped service worker cache to v10');

console.log('DONE!');
