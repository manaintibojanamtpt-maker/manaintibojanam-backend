import fs from 'fs';

// 1. Update index.html
const indexPath = 'f:/Manaintibojanam_final2/index.html';
let indexContent = fs.readFileSync(indexPath, 'utf8');

indexContent = indexContent.replace(/\/icon-v17-/g, '/icon-v18-');
indexContent = indexContent.replace(/\/logo-v17-perfect\.svg/g, '/logo-v18-flawless.svg');
indexContent = indexContent.replace(/\?v=17/g, '?v=18');
fs.writeFileSync(indexPath, indexContent);
console.log('Updated index.html');

// 2. Update manifest.json
const manifestPath = 'f:/Manaintibojanam_final2/public/manifest.json';
let manifestContent = fs.readFileSync(manifestPath, 'utf8');
manifestContent = manifestContent.replace(/\/icon-v17-/g, '/icon-v18-');
manifestContent = manifestContent.replace(/\/logo-v17-perfect\.svg/g, '/logo-v18-flawless.svg');
fs.writeFileSync(manifestPath, manifestContent);
console.log('Updated manifest.json');

// 3. Update React Files
const reactFiles = [
  'f:/Manaintibojanam_final2/src/pages/AdminLogin.tsx',
  'f:/Manaintibojanam_final2/src/pages/Home.tsx',
  'f:/Manaintibojanam_final2/src/App.tsx',
  'f:/Manaintibojanam_final2/src/pages/Login.tsx'
];

for (const file of reactFiles) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\/logo-v17-perfect\.svg/g, '/logo-v18-flawless.svg');
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}

console.log('Successfully updated codebase to v18!');
