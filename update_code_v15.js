import fs from 'fs';

// 1. Update index.html
const indexPath = 'f:/Manaintibojanam_final2/index.html';
let indexContent = fs.readFileSync(indexPath, 'utf8');

// The new splash screen should just be the big v15 logo, centered, with no extra text
const newSplashHTML = `
    <!-- Premium Splash Screen with Baked-In Text Logo -->
    <div id="initial-loader" style="position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: radial-gradient(circle at center, #1f1f1f 0%, #050505 80%); z-index: 9999; padding-bottom: env(safe-area-inset-bottom);">
      <img src="/logo-v15-branded.svg" alt="Mana Inti Bojanam Logo" style="width: 75vw; max-width: 380px; height: auto; animation: pulseEmblem 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; filter: drop-shadow(0 15px 30px rgba(0,0,0,0.9));" />
    </div>
`;

// Replace the old loader logic
indexContent = indexContent.replace(/<!-- Premium Splash Screen -->[\s\S]*?<\/div>\s*<\/div>/, newSplashHTML);
indexContent = indexContent.replace(/\/icon-v14-/g, '/icon-v15-');
indexContent = indexContent.replace(/\/logo-v14-/g, '/logo-v15-');
indexContent = indexContent.replace(/\?v=14/g, '?v=15');
fs.writeFileSync(indexPath, indexContent);
console.log('Updated index.html');

// 2. Update manifest.json
const manifestPath = 'f:/Manaintibojanam_final2/public/manifest.json';
let manifestContent = fs.readFileSync(manifestPath, 'utf8');
manifestContent = manifestContent.replace(/\/icon-v14-/g, '/icon-v15-');
manifestContent = manifestContent.replace(/\/logo-v14-emblem\.svg/g, '/logo-v15-branded.svg');
fs.writeFileSync(manifestPath, manifestContent);
console.log('Updated manifest.json');

// 3. Update React Files
const reactFiles = [
  'f:/Manaintibojanam_final2/src/pages/AdminLogin.tsx',
  'f:/Manaintibojanam_final2/src/pages/Home.tsx',
  'f:/Manaintibojanam_final2/src/App.tsx'
];

for (const file of reactFiles) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\/logo-v14-emblem\.svg/g, '/logo-v15-branded.svg');
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}

// 4. Update Login.tsx (Requires removing the separate HTML text since it's now baked into v15)
const loginPath = 'f:/Manaintibojanam_final2/src/pages/Login.tsx';
let loginContent = fs.readFileSync(loginPath, 'utf8');
loginContent = loginContent.replace(/\/logo-v14-emblem\.svg/g, '/logo-v15-branded.svg');

// Remove the HTML typography below the logo in Login.tsx
const textToRemove = `
            <h1 className="text-[2.2rem] font-black tracking-[-0.02em] leading-none mb-2" style={{ fontFamily: "'Playfair Display', serif", color: "#EADCA6" }}>
              Mana Inti Bojanam
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] ml-1" style={{ fontFamily: "'Inter', sans-serif", color: "#C5A059", opacity: 0.8 }}>
              Authentic & Traditional
            </p>`;
loginContent = loginContent.replace(textToRemove, '');

// Make the logo inside the glassmorphism card much bigger to act as the full title
loginContent = loginContent.replace(/className="w-24 h-24 object-contain drop-shadow-\[\w+\]"/, 'className="w-48 h-48 sm:w-56 sm:h-56 object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"');

fs.writeFileSync(loginPath, loginContent);
console.log('Updated Login.tsx');
