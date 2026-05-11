export const generateWhatsAppLink = (phone: string, message: string) => {
  // Normalize phone number (remove +, spaces, etc.)
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  
  // Use wa.me for universal compatibility
  return `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodedMessage}`;
};

export const getDeliveryMessage = (orderNumber: string, customerName: string, invoiceUrl: string) => {
  return `Namaste ${customerName}! 🙏\n\nYour order #${orderNumber} from *Mana Inti Bojanam* has been delivered! 🍛\n\nWe hope you enjoy your home-style meal. You can download your digital invoice here:\n${invoiceUrl}\n\nThank you for choosing us! ✨`;
};
