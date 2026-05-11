import fs from 'fs';

const reactFiles = [
  'f:/Manaintibojanam_final2/src/pages/AdminLogin.tsx',
  'f:/Manaintibojanam_final2/src/pages/Home.tsx',
  'f:/Manaintibojanam_final2/src/App.tsx'
];

for (const file of reactFiles) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\/logo-v13-branded\.svg/g, '/logo-v14-emblem.svg');
  // For AdminLogin, let's also remove any rounded-3xl or rounded-full from the image if it exists, since it's an emblem now
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}
