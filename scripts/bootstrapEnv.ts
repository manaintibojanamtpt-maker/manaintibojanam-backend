import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');
const envLocalPath = path.join(rootDir, '.env.local');

// 1. Load base .env first
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// 2. Load .env.local second with override: true (local overrides default)
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}
