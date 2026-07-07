import { ownerApiRequest } from './ownerProvisioning';
import type { RawIngredient } from '../types';

export async function fetchOwnerIngredients(tenantId: string) {
  return ownerApiRequest<{ success: boolean; tenantId: string; ingredients: RawIngredient[] }>(
    'GET',
    `/api/owner/ingredients?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function createOwnerIngredient(
  tenantId: string,
  payload: Omit<RawIngredient, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
) {
  return ownerApiRequest<{ success: boolean; id: string; ingredient: RawIngredient }>(
    'POST',
    '/api/owner/ingredients',
    { tenantId, ...payload },
  );
}

export async function updateOwnerIngredient(
  tenantId: string,
  ingredientId: string,
  payload: Partial<Omit<RawIngredient, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>,
) {
  return ownerApiRequest<{ success: boolean; id: string; ingredient: RawIngredient }>(
    'PUT',
    `/api/owner/ingredients/${encodeURIComponent(ingredientId)}`,
    { tenantId, ...payload },
  );
}

export async function deleteOwnerIngredient(tenantId: string, ingredientId: string) {
  return ownerApiRequest<{ success: boolean; id: string }>(
    'DELETE',
    `/api/owner/ingredients/${encodeURIComponent(ingredientId)}?tenantId=${encodeURIComponent(tenantId)}`,
  );
}
