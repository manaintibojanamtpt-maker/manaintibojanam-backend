import fs from 'fs';

const files = [
  'f:/Manaintibojanam_final2/src/pages/Login.tsx',
  'f:/Manaintibojanam_final2/src/pages/AdminLogin.tsx',
  'f:/Manaintibojanam_final2/src/pages/Home.tsx',
  'f:/Manaintibojanam_final2/src/App.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\/logo_premium\.png/g, '/logo-v10-branded.svg');
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}
