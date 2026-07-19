#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/domain/pricing');

for (const entry of fs.readdirSync(dir, { recursive: true })) {
  const rel = String(entry);
  if (!rel.endsWith('Validation.ts')) continue;
  const full = path.join(dir, rel);
  let content = fs.readFileSync(full, 'utf8');
  if (!content.includes('const errors = []')) continue;
  if (!content.includes('PricingDomainError')) {
    content = content.replace(
      'type PricingDomainValidationResult,',
      'type PricingDomainValidationResult,\n  type PricingDomainError,'
    );
  }
  content = content.replaceAll('const errors = []', 'const errors: PricingDomainError[] = []');
  fs.writeFileSync(full, content);
  console.log('fixed', rel);
}
