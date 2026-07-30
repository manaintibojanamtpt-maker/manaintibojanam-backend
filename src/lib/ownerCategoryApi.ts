import { ownerApiRequest } from './ownerProvisioning';

export type OwnerCategory = {
  id: string;
  tenantId: string;
  name: string;
  priority: number;
  isActive: boolean;
  showOnHome: boolean;
  image?: string;
};

export type OwnerCategoryInput = {
  tenantId: string;
  name: string;
  priority?: number;
  isActive?: boolean;
  showOnHome?: boolean;
  image?: string;
};

export async function fetchOwnerCategories(tenantId: string) {
  return ownerApiRequest<{ success: boolean; tenantId: string; categories: OwnerCategory[] }>(
    'GET',
    `/api/owner/menu/categories?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function createOwnerCategory(input: OwnerCategoryInput) {
  return ownerApiRequest<{ success: boolean; id: string; category: OwnerCategory }>(
    'POST',
    '/api/owner/menu/categories',
    input,
  );
}

export async function updateOwnerCategory(categoryId: string, input: OwnerCategoryInput) {
  return ownerApiRequest<{ success: boolean; id: string; category: OwnerCategory }>(
    'PUT',
    `/api/owner/menu/categories/${encodeURIComponent(categoryId)}`,
    input,
  );
}

export async function deleteOwnerCategory(categoryId: string, tenantId: string) {
  return ownerApiRequest<{ success: boolean; id: string }>(
    'DELETE',
    `/api/owner/menu/categories/${encodeURIComponent(categoryId)}?tenantId=${encodeURIComponent(tenantId)}`,
  );
}
