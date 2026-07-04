#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function run(label, command, args) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\n[gate:m1] FAILED at ${label}`);
    process.exit(result.status ?? 1);
  }
}

const requiredDocs = [
  'docs/m1/M1-AUTHENTICATION-REPORT.md',
  'docs/m1/ARCHITECTURE-REPORT.md',
  'docs/m1/MIGRATION-NOTES.md',
  'docs/m1/DEVELOPER-GUIDE.md',
  'docs/m1/ACCEPTANCE-CHECKLIST.md',
  'docs/m1/ROLLBACK-PLAN.md',
  'firestore.rules',
];

const requiredAuthFiles = [
  'src/features/auth/application/authService.ts',
  'src/features/auth/application/profileBootstrapService.ts',
  'src/features/auth/infrastructure/firebaseAuth.ts',
  'src/features/auth/infrastructure/customerRepository.ts',
  'src/features/auth/hooks/useCustomerProfile.ts',
  'src/features/auth/ui/AuthShellPage.tsx',
  'src/features/auth/ui/PhoneOtpForm.tsx',
  'src/features/auth/ui/RequireAuth.tsx',
  'src/features/auth/ui/ProfilePage.tsx',
];

for (const doc of requiredDocs) {
  if (!existsSync(resolve(root, doc))) {
    console.error(`[gate:m1] Missing required file: ${doc}`);
    process.exit(1);
  }
}

for (const file of requiredAuthFiles) {
  if (!existsSync(resolve(root, file))) {
    console.error(`[gate:m1] Missing auth implementation: ${file}`);
    process.exit(1);
  }
}

run('TypeScript + ESLint', 'npm', ['run', 'lint']);
run('Unit tests', 'npm', ['run', 'test:unit']);
run('OpenAPI validation', 'npm', ['run', 'test:openapi']);
run('Production build', 'npm', ['run', 'build']);
run('M0 + BDS regression', 'npm', ['run', 'gate:m0']);

console.log('\n=== OrderBhojan M1 Authentication Gate PASSED ===');
