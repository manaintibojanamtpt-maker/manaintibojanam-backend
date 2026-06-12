const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

const dbImportsList = ['getDb', 'useFirestoreConnection', 'forceOnline', 'isFirestoreConnected', 'handleFirestoreError', 'OperationType', 'FirestoreErrorInfo'];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Regex to find import { ... } from '...firebase'
  const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]*(?:\/firebase|\.\/firebase|\.\.\/firebase))['"];?/g;

  content = content.replace(importRegex, (match, importString, modulePath) => {
    const tokens = importString.split(',').map(t => t.trim()).filter(Boolean);
    
    const authTokens = [];
    const dbTokens = [];
    
    tokens.forEach(t => {
      // some tokens might have aliasing like "getDb as db"
      const baseToken = t.split(/\s+as\s+/)[0].trim();
      if (dbImportsList.includes(baseToken)) {
        dbTokens.push(t);
      } else {
        authTokens.push(t);
      }
    });

    if (dbTokens.length === 0) {
      return match; // No DB imports, leave as is
    }

    // Determine the relative path to lib/firebase-db.ts
    // Assuming modulePath is like '../firebase' or './firebase'
    let dbModulePath = modulePath.replace(/firebase$/, 'lib/firebase-db');
    
    let replacement = '';
    if (authTokens.length > 0) {
      replacement += `import { ${authTokens.join(', ')} } from '${modulePath}';\n`;
    }
    replacement += `import { ${dbTokens.join(', ')} } from '${dbModulePath}';`;
    
    return replacement;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated: ' + filePath);
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      if (f === 'firebase.ts' || f === 'firebase-db.ts') return;
      processFile(dirPath);
    }
  });
}

walkDir(srcDir);
console.log('Done replacing imports.');
