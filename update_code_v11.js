import fs from 'fs';

const reactFiles = [
  'f:/Manaintibojanam_final2/src/pages/Login.tsx',
  'f:/Manaintibojanam_final2/src/pages/AdminLogin.tsx',
  'f:/Manaintibojanam_final2/src/pages/Home.tsx',
  'f:/Manaintibojanam_final2/src/App.tsx'
];

for (const file of reactFiles) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\/logo-v10-branded\.svg/g, '/logo-v11-branded.svg');
  // Replace rounded-full with rounded-3xl for the logo
  // In Login: w-28 h-28 rounded-full
  // In AdminLogin: w-24 h-24 object-contain rounded-full
  // In Home: w-9 h-9 object-contain rounded-full
  if (file.includes('Login.tsx') || file.includes('AdminLogin.tsx') || file.includes('Home.tsx')) {
     content = content.replace(/rounded-full/g, 'rounded-3xl');
  }
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}

const manifestPath = 'f:/Manaintibojanam_final2/public/manifest.json';
let manifestContent = fs.readFileSync(manifestPath, 'utf8');
manifestContent = manifestContent.replace(/\/logo-v10-branded\.svg/g, '/logo-v11-branded.svg');
manifestContent = manifestContent.replace(/\/icon-v10-/g, '/icon-v11-');
manifestContent = manifestContent.replace(/\?v=10/g, '?v=11');
fs.writeFileSync(manifestPath, manifestContent);
console.log('Updated manifest.json');

const indexPath = 'f:/Manaintibojanam_final2/index.html';
let indexContent = fs.readFileSync(indexPath, 'utf8');
indexContent = indexContent.replace(/\/logo-v10-branded\.svg/g, '/logo-v11-branded.svg');
indexContent = indexContent.replace(/\/icon-v10-/g, '/icon-v11-');
indexContent = indexContent.replace(/\?v=10/g, '?v=11');
fs.writeFileSync(indexPath, indexContent);
console.log('Updated index.html');
