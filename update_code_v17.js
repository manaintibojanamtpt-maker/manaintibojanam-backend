import fs from 'fs';

// 1. Update index.html
const indexPath = 'f:/Manaintibojanam_final2/index.html';
let indexContent = fs.readFileSync(indexPath, 'utf8');

indexContent = indexContent.replace(/\/icon-v16-/g, '/icon-v17-');
indexContent = indexContent.replace(/\/logo-v16-perfect\.png/g, '/logo-v17-perfect.svg');
indexContent = indexContent.replace(/\?v=16/g, '?v=17');

// Ensure splash screen image styling doesn't force a circular crop or width limit that is too small
// The squircle design needs a bit more space to shine.
indexContent = indexContent.replace(/max-width: 350px;/, 'max-width: 320px;');

fs.writeFileSync(indexPath, indexContent);
console.log('Updated index.html');

// 2. Update manifest.json
const manifestPath = 'f:/Manaintibojanam_final2/public/manifest.json';
let manifestContent = fs.readFileSync(manifestPath, 'utf8');
manifestContent = manifestContent.replace(/\/icon-v16-/g, '/icon-v17-');
manifestContent = manifestContent.replace(/\/logo-v16-perfect\.png/g, '/logo-v17-perfect.svg');
manifestContent = manifestContent.replace(/"type": "image\/png"/g, '"type": "image/svg+xml"'); // Revert type
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
  content = content.replace(/\/logo-v16-perfect\.png/g, '/logo-v17-perfect.svg');
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}

console.log('Successfully updated codebase to v17!');
