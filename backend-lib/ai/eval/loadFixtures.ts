import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AI_EVAL_FIXTURE_SET_VERSION, AI_EVAL_SCHEMA_VERSION } from '../aiEvalConfig.js';
import type { GoldenCase, GoldenFixtureFile } from './types.js';

/** Resolve fixture dir for ESM (tsx) and CJS server bundle (import.meta may be empty). */
function resolveEvalDir(): string {
  try {
    const metaUrl = import.meta?.url;
    if (typeof metaUrl === 'string' && metaUrl.length > 0) {
      return dirname(fileURLToPath(metaUrl));
    }
  } catch {
    // fall through
  }
  return join(process.cwd(), 'backend-lib', 'ai', 'eval');
}

const __dirname = resolveEvalDir();

export function getGoldenFixtureDir(fixtureSetVersion: string = AI_EVAL_FIXTURE_SET_VERSION): string {
  return join(__dirname, 'fixtures', `v${fixtureSetVersion}`);
}

export function loadGoldenCases(fixtureSetVersion: string = AI_EVAL_FIXTURE_SET_VERSION): GoldenCase[] {
  const dir = getGoldenFixtureDir(fixtureSetVersion);
  const files = readdirSync(dir).filter((name) => name.endsWith('.json')).sort();
  const cases: GoldenCase[] = [];

  for (const file of files) {
    const raw = readFileSync(join(dir, file), 'utf8');
    const parsed = JSON.parse(raw) as GoldenFixtureFile;
    if (parsed.schemaVersion !== AI_EVAL_SCHEMA_VERSION) {
      throw new Error(
        `Fixture ${file}: schemaVersion ${parsed.schemaVersion} !== ${AI_EVAL_SCHEMA_VERSION}`,
      );
    }
    if (parsed.fixtureSetVersion !== fixtureSetVersion) {
      throw new Error(
        `Fixture ${file}: fixtureSetVersion ${parsed.fixtureSetVersion} !== ${fixtureSetVersion}`,
      );
    }
    for (const c of parsed.cases) {
      cases.push({
        ...c,
        category: c.category ?? parsed.category,
      });
    }
  }

  return cases;
}
