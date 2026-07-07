import { ownerApiRequest } from '../lib/ownerProvisioning';

/** Starter menu for cloud-kitchen onboarding — popular South Indian items */
export const CLOUD_KITCHEN_TEMPLATE_ITEMS = [
  { name: 'Idli (3)', price: 70, category: 'Breakfast', type: 'veg', isVeg: true, description: 'Soft steamed idlis with sambar and coconut chutney.' },
  { name: 'Plain Dosa', price: 50, category: 'Breakfast', type: 'veg', isVeg: true, description: 'Crispy golden dosa with chutney and sambar.' },
  { name: 'Masala Dosa', price: 80, category: 'Breakfast', type: 'veg', isVeg: true, description: 'Crispy dosa with spiced potato masala filling.' },
  { name: 'Sambar Rice', price: 119, category: 'Meals', type: 'veg', isVeg: true, description: 'Hot sambar rice with lentil stew and tempering.' },
  { name: 'Curd Rice', price: 129, category: 'Meals', type: 'veg', isVeg: true, description: 'Creamy curd rice with mild seasoning.' },
  { name: 'Veg Fried Rice', price: 99, category: 'Rice', type: 'veg', isVeg: true, description: 'Classic veg fried rice with crunchy vegetables.' },
  { name: 'Chicken Fried Rice', price: 189, category: 'Rice', type: 'non-veg', isVeg: false, description: 'Chicken fried rice with tender meat and crisp veggies.' },
  { name: 'Andhra Veg Thali (Mini)', price: 149, category: 'Thali', type: 'veg', isVeg: true, description: 'Compact Andhra veg thali for a lighter meal.' },
];

export async function seedCloudKitchenTemplate(tenantId: string): Promise<number> {
  const payload = await ownerApiRequest<{ added: number }>('POST', '/api/owner/menu/seed-template', { tenantId });
  return payload.added ?? 0;
}
