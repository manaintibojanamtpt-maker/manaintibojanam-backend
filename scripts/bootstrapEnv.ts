import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const rootDir = process.cwd();
const envLocalPath = path.join(rootDir, '.env.local');

// 1. Load .env.local if present
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

// 2. Load .env fallback if present
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
