#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = [path.join(root, 'src'), path.join(root, 'backend-lib')];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, out);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

let fixed = 0;
for (const base of targets) {
  if (!fs.existsSync(base)) continue;
  for (const file of walk(base)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('sdkFail(')) continue;
    if (/\bsdkFail\b/.test(content.split('sdkFail(')[0])) continue;

    const importRe = /import\s*\{([^}]+)\}\s*from\s*(['"])([^'"]*resultHelpers)\2;/;
    const match = content.match(importRe);
    if (match) {
      const names = match[1].split(',').map((s) => s.trim()).filter(Boolean);
      if (!names.includes('sdkFail')) {
        names.push('sdkFail');
        content = content.replace(
          match[0],
          `import { ${names.join(', ')} } from ${match[2]}${match[3]}${match[2]};`
        );
        fs.writeFileSync(file, content);
        fixed += 1;
        console.log('import', path.relative(root, file));
      }
      continue;
    }

    const depth = file.includes(`${path.sep}src${path.sep}`)
      ? file.split(`${path.sep}src${path.sep}`)[1].split(path.sep).length - 1
      : 2;
    const prefix = '../'.repeat(depth);
    const firstImport = content.indexOf('import ');
    if (firstImport === -1) continue;
    content = `${content.slice(0, firstImport)}import { sdkFail } from '${prefix}sdk/core/resultHelpers';\n${content.slice(firstImport)}`;
    fs.writeFileSync(file, content);
    fixed += 1;
    console.log('added', path.relative(root, file));
  }
}

console.log(`fixed ${fixed} files`);
