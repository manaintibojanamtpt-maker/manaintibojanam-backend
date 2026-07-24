/** Deterministic expect matchers for golden cases. */

export function matchExpect(
  actual: Record<string, unknown>,
  expect: Record<string, unknown>,
): string[] {
  const errors: string[] = [];

  for (const [key, expected] of Object.entries(expect)) {
    const value = actual[key];

    if (expected !== null && typeof expected === 'object' && !Array.isArray(expected)) {
      const nested = expected as Record<string, unknown>;
      if (nested.$includes !== undefined) {
        const needle = String(nested.$includes);
        const hay = Array.isArray(value)
          ? value.map(String).join('\n')
          : value == null
            ? ''
            : String(value);
        if (!hay.includes(needle)) {
          errors.push(`${key}: expected to include ${JSON.stringify(needle)}, got ${JSON.stringify(value)}`);
        }
        continue;
      }
      if (nested.$regex !== undefined) {
        const re = new RegExp(String(nested.$regex), nested.$flags ? String(nested.$flags) : undefined);
        const hay = value == null ? '' : String(value);
        if (!re.test(hay)) {
          errors.push(`${key}: expected /${nested.$regex}/ to match ${JSON.stringify(value)}`);
        }
        continue;
      }
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`${key}: expected object, got ${JSON.stringify(value)}`);
        continue;
      }
      errors.push(...matchExpect(value as Record<string, unknown>, nested).map((e) => `${key}.${e}`));
      continue;
    }

    if (Array.isArray(expected)) {
      if (!Array.isArray(value)) {
        errors.push(`${key}: expected array, got ${JSON.stringify(value)}`);
        continue;
      }
      for (const item of expected) {
        if (!value.some((v) => deepEqual(v, item))) {
          errors.push(`${key}: expected array to contain ${JSON.stringify(item)}`);
        }
      }
      continue;
    }

    if (!deepEqual(value, expected)) {
      errors.push(`${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
    }
  }

  return errors;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
    for (const key of keys) {
      if (!deepEqual(ao[key], bo[key])) return false;
    }
    return true;
  }
  return false;
}
