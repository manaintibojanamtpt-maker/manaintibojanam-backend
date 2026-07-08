/** Coerce unknown API/Firestore values to safe React text. */
export function safeText(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') {
    const record = value as { name?: unknown; label?: unknown; phone?: unknown };
    if (typeof record.name === 'string') return record.name.trim() || fallback;
    if (typeof record.label === 'string') return record.label.trim() || fallback;
    if (typeof record.phone === 'string') return record.phone.trim() || fallback;
  }
  return fallback;
}

export function phoneDigits(value: unknown): string {
  return safeText(value).replace(/\D/g, '');
}

export function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(safeText(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}
