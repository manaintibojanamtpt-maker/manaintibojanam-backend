import fs from 'fs';
import path from 'path';

const src = process.argv[2] || 'F:/Manaintibojanam_final2/manaintibojanam-backend.env';
const destDir = process.argv[3] || 'F:/Manaintibojanam_final2/manaintibojanam-backend';
const destEnv = path.join(destDir, '.env');
const destSa = path.join(destDir, '.firebase-service-account.json');

function parseServiceAccount(raw) {
  let v = raw.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }

  const attempts = [
    ['direct', () => JSON.parse(v)],
    ['quoted-unescape', () => JSON.parse(JSON.parse(`"${v}"`))],
    [
      'c-unescape',
      () =>
        JSON.parse(
          v
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\'),
        ),
    ],
  ];

  const errors = [];
  for (const [label, fn] of attempts) {
    try {
      const obj = fn();
      if (obj && obj.private_key && obj.client_email && obj.project_id) {
        console.log(`SA parse strategy: ${label}`);
        return obj;
      }
      errors.push(`${label}: missing fields`);
    } catch (e) {
      errors.push(`${label}: ${String(e.message || e).split('\n')[0]}`);
    }
  }
  throw new Error(`Could not parse FIREBASE_SERVICE_ACCOUNT\n${errors.join('\n')}`);
}

const text = fs.readFileSync(src, 'utf8');
const lines = text.split(/\r?\n/);
const out = [];
let saObj = null;

for (const line of lines) {
  if (!line || line.trim().startsWith('#')) {
    out.push(line);
    continue;
  }
  const eq = line.indexOf('=');
  if (eq < 0) {
    out.push(line);
    continue;
  }
  const key = line.slice(0, eq);
  let val = line.slice(eq + 1);

  if (key === 'FIREBASE_SERVICE_ACCOUNT') {
    saObj = parseServiceAccount(val);
    // Prefer file-based credentials locally to avoid .env JSON escaping issues.
    continue;
  }
  if (key === 'NODE_ENV') {
    val = 'development';
  }
  if (key === 'GOOGLE_APPLICATION_CREDENTIALS') {
    continue;
  }
  out.push(`${key}=${val}`);
}

if (!saObj) throw new Error('FIREBASE_SERVICE_ACCOUNT missing in source env');

const fpLine = out.find((l) => l.startsWith('FIREBASE_PROJECT_ID='));
const fp = fpLine?.slice('FIREBASE_PROJECT_ID='.length);
if (!fp) throw new Error('FIREBASE_PROJECT_ID missing');

const final = out.map((l) =>
  l.startsWith('GOOGLE_CLOUD_PROJECT=') ? `GOOGLE_CLOUD_PROJECT=${fp}` : l,
);

final.push(`GOOGLE_APPLICATION_CREDENTIALS=${destSa.replace(/\\/g, '/')}`);

fs.writeFileSync(destSa, `${JSON.stringify(saObj, null, 2)}\n`, 'utf8');
fs.writeFileSync(destEnv, `${final.join('\n')}\n`, 'utf8');

console.log('Wrote .firebase-service-account.json');
console.log('Wrote .env with GOOGLE_APPLICATION_CREDENTIALS');
console.log(`sa_project_match=${saObj.project_id === fp}`);
console.log(`has_private_key=${Boolean(saObj.private_key)}`);
