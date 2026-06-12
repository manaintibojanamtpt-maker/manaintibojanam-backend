const fs = require('fs');
const path = require('path');

const homePath = path.join(__dirname, '../src/pages/Home.tsx');
let content = fs.readFileSync(homePath, 'utf8');

// 1. Import PremiumImage if not present
if (!content.includes('PremiumImage')) {
  // Find the last import statement
  const lastImportIndex = content.lastIndexOf('import ');
  const endOfLastImport = content.indexOf('\n', lastImportIndex);
  content = content.slice(0, endOfLastImport) + "\nimport PremiumImage from '../components/PremiumImage';\n" + content.slice(endOfLastImport);
}

// 2. Replace the Category avatar images (line ~435)
// <img src={cat.image} alt={cat.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
content = content.replace(
  /<img\s+src=\{cat\.image\}\s+alt=\{cat\.name\}\s+className="([^"]+)"\s+loading="lazy"\s*\/>/g,
  `<PremiumImage src={cat.image} alt={cat.name} className="$1" containerClassName="w-full h-full" loading="lazy" useShimmer={true} />`
);

// 3. Replace the featured banner (line ~512)
// <img src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=400&auto=format&fit=crop" className="w-full h-full object-cover rounded-[1.5rem]" alt="" />
content = content.replace(
  /<img src="https:\/\/images\.unsplash\.com([^"]+)" className="w-full h-full object-cover rounded-\[1\.5rem\]" alt="" \/>/g,
  `<PremiumImage src="https://images.unsplash.com$1" className="w-full h-full object-cover rounded-[1.5rem]" containerClassName="w-full h-full rounded-[1.5rem]" alt="Featured" useShimmer={true} />`
);

// 4. Replace the aspect-square popular images (line ~859)
// <img src="https://images.unsplash.com/..."" alt="Delicious Meal" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
content = content.replace(
  /<img\s+src="([^"]+)"\s+alt="Delicious Meal"\s+className="([^"]+)"\s+referrerPolicy="no-referrer"\s*\/>/g,
  `<PremiumImage src="$1" alt="Delicious Meal" className="$2" containerClassName="w-full h-full" referrerPolicy="no-referrer" />`
);

// 5. Replace catering collage images (line ~1007)
content = content.replace(
  /<img src="([^"]+)" alt="Catering" className="([^"]+)" referrerPolicy="no-referrer" \/>/g,
  `<PremiumImage src="$1" alt="Catering" className="$2" containerClassName="w-full h-full rounded-[2.5rem]" referrerPolicy="no-referrer" />`
);

fs.writeFileSync(homePath, content, 'utf8');
console.log('Home.tsx images updated!');
