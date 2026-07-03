/**
 * Event domain — schema version resolver (pure, M6 PR-1).
 */

import type { RegisteredSchema } from '../registry/EventTypeRegistry';

export interface VersionResolution {
  readonly resolved: boolean;
  readonly schema?: RegisteredSchema;
  readonly reason?: 'NOT_FOUND' | 'DEPRECATED' | 'VERSION_MISMATCH';
}

export function resolveEventSchemaVersion(
  schemas: readonly RegisteredSchema[],
  type: string,
  requestedVersion: string
): VersionResolution {
  const exact = schemas.find((s) => s.type === type && s.version === requestedVersion);
  if (exact) {
    return { resolved: true, schema: exact };
  }

  const sameType = schemas.filter((s) => s.type === type);
  if (sameType.length === 0) {
    return { resolved: false, reason: 'NOT_FOUND' };
  }

  const sorted = [...sameType].sort((a, b) => compareSemver(b.version, a.version));
  const latest = sorted[0];
  if (latest.version !== requestedVersion) {
    return { resolved: false, reason: 'VERSION_MISMATCH', schema: latest };
  }

  return { resolved: true, schema: latest };
}

function compareSemver(a: string, b: string): number {
  const parse = (v: string) => v.split('.').map((n) => parseInt(n, 10) || 0);
  const [aM, aN, aP] = parse(a);
  const [bM, bN, bP] = parse(b);
  if (aM !== bM) return aM - bM;
  if (aN !== bN) return aN - bN;
  return aP - bP;
}
