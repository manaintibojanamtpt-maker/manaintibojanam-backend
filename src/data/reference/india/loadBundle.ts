import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IndiaReferenceBundle, ReferenceBundleManifest } from './schema';
import { INDIA_REFERENCE_BUNDLE_VERSION } from './schema';

const bundleDir = dirname(fileURLToPath(import.meta.url));

function readJson<T>(filename: string): T {
  const raw = readFileSync(join(bundleDir, 'bundle', filename), 'utf8');
  return JSON.parse(raw) as T;
}

/** Read-only bundle loader for tests and future ReferenceSDK static adapter. */
export function loadIndiaReferenceBundle(): IndiaReferenceBundle {
  const manifest = readJson<ReferenceBundleManifest>('manifest.json');
  const country = readJson<IndiaReferenceBundle['country']>('country.json');
  const states = readJson<IndiaReferenceBundle['states']>('states.json');
  const districts = readJson<IndiaReferenceBundle['districts']>('districts.json');
  const cities = readJson<IndiaReferenceBundle['cities']>('cities.json');
  const localities = readJson<IndiaReferenceBundle['localities']>('localities.json');
  const pincodes = readJson<IndiaReferenceBundle['pincodes']>('pincodes.json');

  return {
    manifest,
    country,
    states,
    districts,
    cities,
    localities,
    pincodes,
  };
}

export function getIndiaReferenceBundleVersion(): string {
  return INDIA_REFERENCE_BUNDLE_VERSION;
}

export { INDIA_REFERENCE_BUNDLE_VERSION };
