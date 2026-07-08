export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function bdsDataAttr(name: string, value?: string | boolean): Record<string, string | undefined> {
  if (value === false || value === undefined) return {};
  return { [`data-bds-${name}`]: value === true ? '' : String(value) };
}
