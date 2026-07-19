#!/usr/bin/env node
/**
 * Fix SdkResult return-type mismatches: `if (!x.ok) return x` -> `if (!x.ok) return sdkFail(x.error)`
 * when the enclosing function returns SdkResult<OtherType>.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  path.join(root, 'src/sdk'),
  path.join(root, 'src/lib'),
];

const returnPattern = /if \(!([a-zA-Z_$][\w$]*)\.ok\) return \1;/g;

function ensureSdkFailImport(content) {
  if (content.includes('sdkFail')) return content;
  const importMatch = content.match(
    /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]*resultHelpers)['"];/
  );
  if (importMatch) {
    const names = importMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
    if (!names.includes('sdkFail')) {
      names.push('sdkFail');
      return content.replace(
        importMatch[0],
        `import { ${names.join(', ')} } from '${importMatch[2]}';`
      );
    }
    return content;
  }
  const depth = content.includes("'../../core/resultHelpers'")
    ? '../../core/resultHelpers'
    : content.includes("'../core/resultHelpers'")
      ? '../core/resultHelpers'
      : "'../../core/resultHelpers'";
  const firstImport = content.indexOf('import ');
  if (firstImport === -1) return content;
  return `${content.slice(0, firstImport)}import { sdkFail } from ${depth};\n${content.slice(firstImport)}`;
}

let filesChanged = 0;
let replacements = 0;

for (const base of targets) {
  if (!fs.existsSync(base)) continue;
  const stack = [base];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        stack.push(full);
        continue;
      }
      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue;
      let content = fs.readFileSync(full, 'utf8');
      const next = content.replace(returnPattern, (_match, varName) => {
        replacements += 1;
        return `if (!${varName}.ok) return sdkFail(${varName}.error);`;
      });
      if (next !== content) {
        const updated = ensureSdkFailImport(next);
        fs.writeFileSync(full, updated);
        filesChanged += 1;
      }
    }
  }
}

console.log(`Updated ${filesChanged} files (${replacements} replacements)`);
