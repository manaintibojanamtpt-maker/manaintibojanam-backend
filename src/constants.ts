export const CONTACT_INFO = {
  phone: '+91 7666258454',
  email: 'manaintibojanam@gmail.com',
  address: 'Tirupati, Andhra Pradesh',
};

export const FOOD_IMAGES: Record<string, string> = {
  'Masala Dosa': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=800',
  'Idli': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=800', // Using similar for now or finding specific ones
  'Chicken Biryani': 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?auto=format&fit=crop&q=80&w=800',
  'Mutton Biryani': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=800',
  'Veg Thali': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=800',
  'Andhra Meals': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=800',
  'Paneer Butter Masala': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&q=80&w=800',
  'Gulab Jamun': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=800',
};

export const getFoodImage = (name: string) => {
  return FOOD_IMAGES[name] || `https://picsum.photos/seed/${encodeURIComponent(name)}/800/600`;
};
