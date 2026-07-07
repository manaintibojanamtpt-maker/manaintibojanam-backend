import { ownerApiRequest } from './ownerProvisioning';

export interface OwnerCoupon {
  id: string;
  tenantId: string;
  code: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  minOrder: number;
  isActive: boolean;
}

export async function fetchOwnerCoupons(tenantId: string) {
  return ownerApiRequest<{ success: boolean; tenantId: string; coupons: OwnerCoupon[] }>(
    'GET',
    `/api/owner/coupons?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function createOwnerCoupon(input: {
  tenantId: string;
  code: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  minOrder: number;
}) {
  return ownerApiRequest<{ success: boolean; id: string }>('POST', '/api/owner/coupons', input);
}

export async function setOwnerCouponActive(tenantId: string, couponId: string, isActive: boolean) {
  return ownerApiRequest<{ success: boolean }>('PATCH', `/api/owner/coupons/${couponId}`, {
    tenantId,
    isActive,
  });
}

export async function deleteOwnerCoupon(tenantId: string, couponId: string) {
  return ownerApiRequest<{ success: boolean }>(
    'DELETE',
    `/api/owner/coupons/${couponId}?tenantId=${encodeURIComponent(tenantId)}`,
  );
}
