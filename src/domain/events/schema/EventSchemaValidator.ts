/**
 * Event domain — JSON schema shape validation (pure, M6 PR-1).
 * Structural check only — no external JSON Schema engine.
 */

export function validateSchemaShape(
  jsonSchema: Readonly<Record<string, unknown>> | undefined
): boolean {
  if (!jsonSchema) return true;
  if (typeof jsonSchema !== 'object') return false;
  if ('type' in jsonSchema && typeof jsonSchema.type !== 'string') return false;
  return true;
}

export function assertRequiredSchemaFields(
  type: string,
  version: string,
  schemaVersion: string
): readonly string[] {
  const missing: string[] = [];
  if (!type) missing.push('type');
  if (!version) missing.push('version');
  if (!schemaVersion) missing.push('schemaVersion');
  return missing;
}
