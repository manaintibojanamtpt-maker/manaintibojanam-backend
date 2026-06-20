type ShareOrderLike = {
  orderNumber?: string | number;
  items?: Array<{ name?: string; quantity?: number }>;
  totalAmount?: number;
};

export const generateWhatsAppLink = (phone: string | undefined, message: string) => {
  const encodedMessage = encodeURIComponent(message);

  if (!phone) {
    return `https://wa.me/?text=${encodedMessage}`;
  }

  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodedMessage}`;
};

export const getDeliveryMessage = (orderNumber: string, customerName: string, invoiceUrl: string) => {
  return `Namaste ${customerName}!\n\nYour order #${orderNumber} from *Mana Inti Bojanam* has been delivered!\n\nYou can download your digital invoice here:\n${invoiceUrl}\n\nThank you for choosing us!`;
};

const formatOrderItems = (items: ShareOrderLike['items'] = []) => {
  return items
    .slice(0, 5)
    .map((item) => `${item.name || 'Item'} x${item.quantity || 1}`)
    .join(', ');
};

export const buildStorefrontUrl = (tenantSlug?: string) => {
  const basePath = tenantSlug ? `/k/${tenantSlug}` : '';
  return `${window.location.origin}${basePath}`;
};

export const buildMenuUrl = (tenantSlug?: string) => {
  const basePath = tenantSlug ? `/k/${tenantSlug}` : '';
  return `${window.location.origin}${basePath}/menu`;
};

export const buildOrderShareMessage = ({
  brandName,
  storefrontUrl,
  order
}: {
  brandName: string;
  storefrontUrl: string;
  order: ShareOrderLike;
}) => {
  const itemsText = formatOrderItems(order.items);
  const totalText = typeof order.totalAmount === 'number' ? `\nTotal paid: Rs. ${order.totalAmount}` : '';

  return `I ordered from *${brandName}* and loved it.\n\nOrder #${order.orderNumber || 'recent'}\nItems: ${itemsText || 'Home-style favorites'}${totalText}\n\nYou can order here:\n${storefrontUrl}`;
};

export const buildReorderIntentMessage = ({
  brandName,
  menuUrl,
  order
}: {
  brandName: string;
  menuUrl: string;
  order: ShareOrderLike;
}) => {
  const itemsText = formatOrderItems(order.items);

  return `Hi ${brandName}, I want to reorder my previous meal.\n\nReference order: #${order.orderNumber || 'recent'}\nItems: ${itemsText || 'Please help me repeat my usual order'}\n\nI am reopening the menu here:\n${menuUrl}`;
};
