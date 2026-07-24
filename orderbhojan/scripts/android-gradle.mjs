/**
 * Cross-platform Gradle runner for orderbhojan/android.
 * Usage: node scripts/android-gradle.mjs <task...>
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const androidDir = path.resolve(__dirname, '..', 'android');
const isWin = process.platform === 'win32';
const gradlew = path.join(androidDir, isWin ? 'gradlew.bat' : 'gradlew');
const tasks = process.argv.slice(2);

if (tasks.length === 0) {
  console.error('Usage: node scripts/android-gradle.mjs <gradle-task...>');
  process.exit(1);
}

const result = spawnSync(gradlew, tasks, {
  cwd: androidDir,
  stdio: 'inherit',
  shell: isWin,
  env: process.env,
});

process.exit(result.status ?? 1);
