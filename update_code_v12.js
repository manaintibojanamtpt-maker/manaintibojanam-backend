import fs from 'fs';

const reactFiles = [
  'f:/Manaintibojanam_final2/src/pages/Login.tsx',
  'f:/Manaintibojanam_final2/src/pages/AdminLogin.tsx',
  'f:/Manaintibojanam_final2/src/pages/Home.tsx',
  'f:/Manaintibojanam_final2/src/App.tsx'
];

for (const file of reactFiles) {
  let content = fs.readFileSync(file, 'utf8');
  // Update from v11 to v12
  content = content.replace(/\/logo-v11-branded\.svg/g, '/logo-v12-branded.svg');
  // Also ensure className is clean and properly rounded, not full circle
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}

const manifestPath = 'f:/Manaintibojanam_final2/public/manifest.json';
let manifestContent = fs.readFileSync(manifestPath, 'utf8');
manifestContent = manifestContent.replace(/\/logo-v11-branded\.svg/g, '/logo-v12-branded.svg');
// Since I only generated the v12 SVG, let's keep the fallback PNGs pointing to v11 or whatever they were, but since they are referenced in manifest/html, I should copy them to v12 too just for consistency.
fs.writeFileSync(manifestPath, manifestContent);
console.log('Updated manifest.json');

const indexPath = 'f:/Manaintibojanam_final2/index.html';
let indexContent = fs.readFileSync(indexPath, 'utf8');
indexContent = indexContent.replace(/\/logo-v11-branded\.svg/g, '/logo-v12-branded.svg');
fs.writeFileSync(indexPath, indexContent);
console.log('Updated index.html');
