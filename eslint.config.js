/**
 * M1 PR-1 — Prepared ESLint rules (ADR-011 presentation boundary).
 *
 * Requires devDependencies when enabling full ESLint in a future PR:
 *   npm install -D eslint @eslint/js typescript-eslint
 *
 * Until then, CI uses: npm run lint:presentation
 */

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'server.ts', 'backend-lib/**', 'functions/**'],
  },
  {
    files: ['src/pages/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'firebase/firestore',
              message:
                'Presentation code must not import firebase/firestore directly (ADR-011). Use services or @bhojanos/sdk.',
            },
          ],
        },
      ],
    },
  },
];
