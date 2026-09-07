const { execSync } = require('child_process');
const fs = require('fs');
const { exit } = require('process');

try {
  const output = execSync('node node_modules/typescript/bin/tsc --noEmit 2>&1', {
    cwd: __dirname,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10 // 10MB
  });
  fs.writeFileSync('f:/_tsc_result.txt', output + '\nTSC_EXIT: 0 (success)');
  console.log('TypeScript check passed - 0 errors!');
} catch (error) {
  const output = (error.stdout || '') + (error.stderr || '');
  fs.writeFileSync('f:/_tsc_result.txt', output + '\nTSC_EXIT: ' + (error.status || 1));
  console.error('TypeScript check failed:', error.status);
  console.log('Output: ' + output);
}
