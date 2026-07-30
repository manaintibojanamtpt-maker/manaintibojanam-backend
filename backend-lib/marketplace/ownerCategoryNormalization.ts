export type OwnerCategoryRecord = {
  tenantId: string;
  name: string;
  priority: number;
  isActive: boolean;
  showOnHome: boolean;
  image: string;
};

export function normalizeOwnerCategoryPayload(
  body: Record<string, unknown>,
  tenantId: string,
): OwnerCategoryRecord {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    const err: Error & { statusCode?: number } = new Error('Category name is required');
    err.statusCode = 400;
    throw err;
  }

  const priorityRaw = body.priority;
  const priority =
    typeof priorityRaw === 'number' && Number.isFinite(priorityRaw)
      ? Math.max(0, Math.floor(priorityRaw))
      : typeof priorityRaw === 'string' && priorityRaw.trim() && Number.isFinite(Number(priorityRaw))
        ? Math.max(0, Math.floor(Number(priorityRaw)))
        : 0;

  const image = typeof body.image === 'string' ? body.image.trim() : '';

  return {
    tenantId,
    name,
    priority,
    isActive: body.isActive !== false,
    showOnHome: body.showOnHome === true,
    image,
  };
}

export function parseOwnerCategoryDoc(
  id: string,
  data: Record<string, unknown>,
): (OwnerCategoryRecord & { id: string }) | null {
  const tenantId = typeof data.tenantId === 'string' ? data.tenantId.trim() : '';
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (!tenantId || !name) return null;

  const priority =
    typeof data.priority === 'number' && Number.isFinite(data.priority)
      ? data.priority
      : 0;

  return {
    id,
    tenantId,
    name,
    priority,
    isActive: data.isActive !== false,
    showOnHome: data.showOnHome === true,
    image: typeof data.image === 'string' ? data.image : '',
  };
}
