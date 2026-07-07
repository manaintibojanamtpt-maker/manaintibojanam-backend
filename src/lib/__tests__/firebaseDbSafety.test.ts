import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('firebase-db safety contract', () => {
  it('does not use getDocFromServer cold-probe on init (SDK ca9/da08 regression)', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/firebase-db.ts');
    const source = fs.readFileSync(filePath, 'utf8');
    const importLines = source.split('\n').filter((line) => line.trimStart().startsWith('import'));
    assert.equal(importLines.some((line) => line.includes('getDocFromServer')), false);
    assert.equal(/\bgetDocFromServer\s*\(/.test(source), false);
    assert.match(source, /Do NOT probe Firestore with getDocFromServer/);
    assert.match(source, /ensureFirestoreNetwork/);
  });
});
