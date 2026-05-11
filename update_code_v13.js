import fs from 'fs';

const reactFiles = [
  'f:/Manaintibojanam_final2/src/pages/Login.tsx',
  'f:/Manaintibojanam_final2/src/pages/AdminLogin.tsx',
  'f:/Manaintibojanam_final2/src/pages/Home.tsx',
  'f:/Manaintibojanam_final2/src/App.tsx'
];

for (const file of reactFiles) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\/logo-v12-branded\.svg/g, '/logo-v13-branded.svg');
  // Just in case it's still somehow pointing to v11 or something
  content = content.replace(/\/logo-v11-branded\.svg/g, '/logo-v13-branded.svg');
  content = content.replace(/\/logo-v10-branded\.svg/g, '/logo-v13-branded.svg');
  
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}

const manifestPath = 'f:/Manaintibojanam_final2/public/manifest.json';
let manifestContent = fs.readFileSync(manifestPath, 'utf8');
manifestContent = manifestContent.replace(/\/logo-v12-branded\.svg/g, '/logo-v13-branded.svg');
manifestContent = manifestContent.replace(/\/icon-v12-/g, '/icon-v13-');
manifestContent = manifestContent.replace(/\?v=12/g, '?v=13');
// If it was v11
manifestContent = manifestContent.replace(/\/logo-v11-branded\.svg/g, '/logo-v13-branded.svg');
manifestContent = manifestContent.replace(/\/icon-v11-/g, '/icon-v13-');
manifestContent = manifestContent.replace(/\?v=11/g, '?v=13');
fs.writeFileSync(manifestPath, manifestContent);
console.log('Updated manifest.json');

const indexPath = 'f:/Manaintibojanam_final2/index.html';
let indexContent = fs.readFileSync(indexPath, 'utf8');
indexContent = indexContent.replace(/\/logo-v12-branded\.svg/g, '/logo-v13-branded.svg');
indexContent = indexContent.replace(/\/icon-v12-/g, '/icon-v13-');
indexContent = indexContent.replace(/\?v=12/g, '?v=13');
// If it was v11
indexContent = indexContent.replace(/\/logo-v11-branded\.svg/g, '/logo-v13-branded.svg');
indexContent = indexContent.replace(/\/icon-v11-/g, '/icon-v13-');
indexContent = indexContent.replace(/\?v=11/g, '?v=13');
fs.writeFileSync(indexPath, indexContent);
console.log('Updated index.html');
