import { collection, getDocs, writeBatch, doc, serverTimestamp, addDoc, setDoc } from 'firebase/firestore';
import { getDb } from './lib/firebase-db';

const categorySeedData = [
  { name: "Veg Thali (South Indian Meals)", image: "🍛", priority: 1, isActive: true, showOnHome: true },
  { name: "Veg Rice Items", image: "🍚", priority: 2, isActive: true, showOnHome: true },
  { name: "Veg Fried Rice", image: "🥗", priority: 3, isActive: true, showOnHome: true },
  { name: "Non-Veg Rice Bowls", image: "🍲", priority: 4, isActive: true, showOnHome: true },
  { name: "Non-Veg Fried Rice", image: "🍛", priority: 5, isActive: true, showOnHome: true },
  { name: "Chicken Specials", image: "🍗", priority: 6, isActive: true, showOnHome: true },
  { name: "Idli Varieties", image: "🥞", priority: 7, isActive: true, showOnHome: true },
  { name: "Dosa Varieties", image: "🫓", priority: 8, isActive: true, showOnHome: true },
  { name: "Non-Veg Breakfast Combos", image: "🍳", priority: 9, isActive: true, showOnHome: true }
];

const menuSeedPayload = [
  { name: "Andhra Veg Thali (Full)", price: 199, category: "Veg Thali (South Indian Meals)", type: "veg", isVeg: true, description: "A rich Andhra-style full veg thali with fresh sides and chutneys." },
  { name: "Andhra Veg Thali (Mini)", price: 149, category: "Veg Thali (South Indian Meals)", type: "veg", isVeg: true, description: "Compact Andhra veg thali for a lighter meal." },

  { name: "Sambar Rice", price: 119, category: "Veg Rice Items", type: "veg", isVeg: true, description: "Hot sambar rice with lentil stew and tempering." },
  { name: "Rasam Rice", price: 119, category: "Veg Rice Items", type: "veg", isVeg: true, description: "Comforting rasam rice with tangy tomato broth." },
  { name: "Curd Rice", price: 129, category: "Veg Rice Items", type: "veg", isVeg: true, description: "Creamy curd rice with mild seasoning and herbs." },
  { name: "Ghee Pepper Pongal", price: 129, category: "Veg Rice Items", type: "veg", isVeg: true, description: "Fragrant ghee pepper pongal with South Indian spices." },
  { name: "Lemon Rice", price: 119, category: "Veg Rice Items", type: "veg", isVeg: true, description: "Zesty lemon rice tossed with curry leaves and nuts." },

  { name: "Veg Fried Rice", price: 99, category: "Veg Fried Rice", type: "veg", isVeg: true, description: "Classic veg fried rice with crunchy vegetables and soy seasoning." },
  { name: "Mixed Veg Fried Rice", price: 149, category: "Veg Fried Rice", type: "veg", isVeg: true, description: "Mixed veg fried rice loaded with colorful veggies." },
  { name: "Tomato Rice", price: 99, category: "Veg Fried Rice", type: "veg", isVeg: true, description: "Tangy tomato rice cooked with aromatic spices." },

  { name: "Chicken Keema Rice Bowl", price: 299, category: "Non-Veg Rice Bowls", type: "non-veg", isVeg: false, description: "Spiced chicken keema over fluffy rice." },
  { name: "Egg Masala Rice Bowl", price: 169, category: "Non-Veg Rice Bowls", type: "non-veg", isVeg: false, description: "Masala eggs served with flavorful rice." },

  { name: "Egg Fried Rice", price: 129, category: "Non-Veg Fried Rice", type: "non-veg", isVeg: false, description: "Egg fried rice cooked with peppers and scallions." },
  { name: "Double Egg Fried Rice", price: 149, category: "Non-Veg Fried Rice", type: "non-veg", isVeg: false, description: "Extra egg fried rice for a protein-packed meal." },
  { name: "Chicken Fried Rice", price: 189, category: "Non-Veg Fried Rice", type: "non-veg", isVeg: false, description: "Chicken fried rice with tender meat and crisp veggies." },
  { name: "Double Egg Chicken Fried Rice", price: 189, category: "Non-Veg Fried Rice", type: "non-veg", isVeg: false, description: "Chicken fried rice topped with double egg." },

  { name: "Andhra Chicken Fry", price: 669, category: "Chicken Specials", type: "non-veg", isVeg: false, description: "Spicy Andhra chicken fry with bold masala flavors.", unit: "kg", extraCharge: 20 },
  { name: "Andhra Chicken Gravy", price: 1069, category: "Chicken Specials", type: "non-veg", isVeg: false, description: "Rich Andhra chicken gravy served with rice or roti.", unit: "kg", extraCharge: 20 },
  { name: "Chicken Kheema (Dry/Gravy)", price: 719, category: "Chicken Specials", type: "non-veg", isVeg: false, description: "Versatile chicken kheema, available dry or gravy.", unit: "kg", extraCharge: 20 },

  { name: "Idli (3)", price: 70, category: "Idli Varieties", type: "veg", isVeg: true, description: "Pillowy soft steamed idlis with warm sambar and freshly ground coconut chutney.", badges: ["Soft & Steamy"] },
  { name: "Vada (2)", price: 70, category: "Idli Varieties", type: "veg", isVeg: true, description: "Crunchy medu vadas with a golden crust, served piping hot with coconut chutney.", badges: ["Crunchy"] },
  { name: "Idli (2) & Vada (1)", price: 99, category: "Idli Varieties", type: "veg", isVeg: true, description: "A combo of idli and vada with chutneys." },
  { name: "Idli & Sambar Dip", price: 99, category: "Idli Varieties", type: "veg", isVeg: true, description: "Idli served with sambar dip." },
  { name: "Vada & Sambar Dip", price: 99, category: "Idli Varieties", type: "veg", isVeg: true, description: "Vada served with sambar dip." },
  { name: "Podi Idli (2)", price: 70, category: "Idli Varieties", type: "veg", isVeg: true, description: "Idli tossed in spicy podi." },
  { name: "Ghee Podi Idli (3)", price: 99, category: "Idli Varieties", type: "veg", isVeg: true, description: "Ghee podi idli with aromatic flavors." },

  { name: "Plain Dosa", price: 50, category: "Dosa Varieties", type: "veg", isVeg: true, description: "Crispy golden dosa made fresh, paired with house chutney and warm coconut sambhar.", badges: ["Crispy Classic"] },
  { name: "Ghee Plain Dosa", price: 60, category: "Dosa Varieties", type: "veg", isVeg: true, description: "Ghee-drenched dosa with rich buttery aroma and melt-in-mouth crisp edges.", badges: ["Pure Ghee"] },
  { name: "Karam Dosa", price: 60, category: "Dosa Varieties", type: "veg", isVeg: true, description: "Spicy karam dosa with special seasoning.", badges: ["Spicy"] },
  { name: "Ghee Karam Dosa", price: 70, category: "Dosa Varieties", type: "veg", isVeg: true, description: "Ghee karam dosa with extra richness.", badges: ["Pure Ghee"] },
  { name: "Podi Dosa", price: 60, category: "Dosa Varieties", type: "veg", isVeg: true, description: "Podi dosa served with chutney." },
  { name: "Ghee Podi Dosa", price: 70, category: "Dosa Varieties", type: "veg", isVeg: true, description: "Ghee podi dosa with a buttery finish." },
  { name: "Masala Dosa", price: 80, category: "Dosa Varieties", type: "veg", isVeg: true, description: "Crispy dosa wrapped around spiced potato masala, served with tangy chutney and sambar.", badges: ["Bestseller"] },
  { name: "Karam Masala Dosa", price: 90, category: "Dosa Varieties", type: "veg", isVeg: true, description: "Spicy karam masala dosa with savory filling." },
  { name: "Cheese Dosa", price: 100, category: "Dosa Varieties", type: "veg", isVeg: true, description: "Cheese dosa with melted cheese filling." },
  { name: "Set Dosa (2)", price: 90, category: "Dosa Varieties", type: "veg", isVeg: true, description: "Two soft set dosas served with chutney." },
  { name: "Onion Uttappam", price: 80, category: "Dosa Varieties", type: "veg", isVeg: true, description: "Onion uttappam topped with fresh onions." },

  { name: "Idli (3) + Chicken Curry", price: 150, category: "Non-Veg Breakfast Combos", type: "non-veg", isVeg: false, description: "Breakfast combo of idli and chicken curry." },
  { name: "Vada (2) + Chicken Curry", price: 150, category: "Non-Veg Breakfast Combos", type: "non-veg", isVeg: false, description: "Vada combo served with chicken curry." },
  { name: "Dosa (2) + Chicken Curry", price: 170, category: "Non-Veg Breakfast Combos", type: "non-veg", isVeg: false, description: "Dosa combo served with chicken curry." },
  { name: "Dosa (2) + Kheema", price: 180, category: "Non-Veg Breakfast Combos", type: "non-veg", isVeg: false, description: "Dosa combo served with minced chicken kheema." },
  { name: "Egg Dosa", price: 80, category: "Non-Veg Breakfast Combos", type: "non-veg", isVeg: false, description: "Egg dosa with savory egg filling." },
  { name: "Double Egg Dosa", price: 100, category: "Non-Veg Breakfast Combos", type: "non-veg", isVeg: false, description: "Double egg dosa for extra protein." }
];

const getUnsplashUrl = (name: string) => {
  const normalized = name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[\(\)\+\/]/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `https://source.unsplash.com/featured/?${encodeURIComponent(normalized)}`;
};

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const seedMenuItems = async () => {
  if (!isBrowser) {
    console.warn('seedMenuItems can only run in the browser');
    return;
  }

  if (window.localStorage.getItem('menuSeeded') === 'true') {
    console.log('Menu seed already completed.');
    return;
  }

  const db = getDb();
  const batch = writeBatch(db);

  try {
    const menuSnapshot = await getDocs(collection(db, 'menu'));
    if (!menuSnapshot.empty) {
      console.log('Menu already exists; skipping auto seed to avoid recreating deleted items.');
      window.localStorage.setItem('menuSeeded', 'true');
      return;
    }

    const existingMenuNames = new Set(menuSnapshot.docs.map(doc => (doc.data()?.name || '').toString().trim().toLowerCase()));

    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    const existingCategoryNames = new Set(categoriesSnapshot.docs.map(doc => (doc.data()?.name || '').toString().trim().toLowerCase()));

    let newMenuCount = 0;
    let newCategoryCount = 0;

    for (const category of categorySeedData) {
      const normalized = category.name.trim().toLowerCase();
      if (!existingCategoryNames.has(normalized)) {
        batch.set(doc(collection(db, 'categories')), {
          ...category,
          createdAt: serverTimestamp()
        });
        newCategoryCount += 1;
      }
    }

    for (const item of menuSeedPayload) {
      const normalizedName = item.name.trim().toLowerCase();
      if (existingMenuNames.has(normalizedName)) {
        continue;
      }

      const imageUrl = getUnsplashUrl(item.name);
      batch.set(doc(collection(db, 'menu')), {
        name: item.name,
        description: item.description,
        price: Number(item.price),
        category: item.category,
        type: item.type,
        isVeg: item.isVeg,
        isAvailable: true,
        imageUrl,
        image: imageUrl,
        unit: item.unit,
        extraCharge: item.extraCharge,
        createdAt: serverTimestamp()
      });
      newMenuCount += 1;
    }

    if (newCategoryCount === 0 && newMenuCount === 0) {
      console.log('No new menu items or categories to add.');
      window.localStorage.setItem('menuSeeded', 'true');
      return;
    }

    await batch.commit();
    window.localStorage.setItem('menuSeeded', 'true');
    console.log(`Seeded ${newCategoryCount} new categories and ${newMenuCount} new menu items.`);
  } catch (error) {
    console.error('Failed to seed menu items:', error);
  }
};

const sampleMenuItems = [
  {
    name: "Chicken Biryani",
    description: "Aromatic basmati rice cooked with tender chicken, saffron, and authentic spices. Served with raita and boiled egg.",
    price: 280,
    image: "https://images.unsplash.com/photo-1563379091339-03246963d4bd?q=80&w=400&auto=format&fit=crop",
    category: "Biryani",
    type: "nonVeg",
    isAvailable: true,
    rating: 4.8,
    preparationTime: 25,
    discount: 0,
    isPopular: true,
    isTrending: true
  },
  {
    name: "Paneer Butter Masala",
    description: "Creamy tomato-based curry with soft paneer cubes, flavored with butter and aromatic spices.",
    price: 220,
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?q=80&w=400&auto=format&fit=crop",
    category: "Curry",
    type: "veg",
    isAvailable: true,
    rating: 4.6,
    preparationTime: 15,
    discount: 10,
    isPopular: true,
    isTrending: false
  },
  {
    name: "Mutton Rogan Josh",
    description: "Kashmiri-style mutton curry with Kashmiri chilies, yogurt, and traditional spices.",
    price: 350,
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=400&auto=format&fit=crop",
    category: "Curry",
    type: "nonVeg",
    isAvailable: true,
    rating: 4.9,
    preparationTime: 30,
    discount: 0,
    isPopular: false,
    isTrending: true
  },
  {
    name: "Vegetable Pulao",
    description: "Fragrant rice dish with mixed vegetables, nuts, and mild spices. Perfect for vegetarians.",
    price: 180,
    image: "https://images.unsplash.com/photo-1563379091339-03246963d4bd?q=80&w=400&auto=format&fit=crop",
    category: "Rice",
    type: "veg",
    isAvailable: true,
    rating: 4.4,
    preparationTime: 20,
    discount: 5,
    isPopular: true,
    isTrending: false
  },
  {
    name: "Fish Curry",
    description: "Fresh fish cooked in coconut milk with tamarind, curry leaves, and South Indian spices.",
    price: 320,
    image: "https://images.unsplash.com/photo-1559847844-5315695dadae?q=80&w=400&auto=format&fit=crop",
    category: "Curry",
    type: "nonVeg",
    isAvailable: true,
    rating: 4.7,
    preparationTime: 25,
    discount: 0,
    isPopular: false,
    isTrending: true
  },
  {
    name: "Dal Tadka",
    description: "Yellow lentils tempered with cumin, garlic, and ghee. Served with rice or roti.",
    price: 150,
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=400&auto=format&fit=crop",
    category: "Dal",
    type: "veg",
    isAvailable: true,
    rating: 4.3,
    preparationTime: 15,
    discount: 0,
    isPopular: true,
    isTrending: false
  },
  {
    name: "Chicken 65",
    description: "Spicy, crispy chicken bites marinated in red chilies and fried to perfection.",
    price: 240,
    image: "https://images.unsplash.com/photo-1562967914-608f826c74f8?q=80&w=400&auto=format&fit=crop",
    category: "Appetizer",
    type: "nonVeg",
    isAvailable: true,
    rating: 4.5,
    preparationTime: 20,
    discount: 15,
    isPopular: false,
    isTrending: true
  },
  {
    name: "Aloo Gobi",
    description: "Potatoes and cauliflower cooked with onions, tomatoes, and Indian spices.",
    price: 160,
    image: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?q=80&w=400&auto=format&fit=crop",
    category: "Vegetable",
    type: "veg",
    isAvailable: true,
    rating: 4.2,
    preparationTime: 15,
    discount: 0,
    isPopular: true,
    isTrending: false
  }
];

const sampleCategories = [
  { name: "Biryani", image: "🍛", priority: 1, isActive: true, showOnHome: true },
  { name: "Curry", image: "🍛", priority: 2, isActive: true, showOnHome: true },
  { name: "Rice", image: "🍚", priority: 3, isActive: true, showOnHome: true },
  { name: "Dal", image: "🍛", priority: 4, isActive: true, showOnHome: false },
  { name: "Appetizer", image: "🍗", priority: 5, isActive: true, showOnHome: true },
  { name: "Vegetable", image: "🥕", priority: 6, isActive: true, showOnHome: false }
];

export const populateSampleData = async () => {
  try {
    console.log('Seeding Tenant Document for Mana Inti...');
    const tenantRef = doc(getDb(), 'tenants', 'mana-inti');
    await setDoc(tenantRef, {
      id: "mana-inti",
      slug: "mana-inti",
      name: "BhojanOS",
      ownerId: "SYSTEM_SEEDED",
      isActive: true,
      planId: "enterprise",
      createdAt: serverTimestamp(),
      paymentConfig: {
        provider: "razorpay",
        keyId: "placeholder_to_be_replaced",
        secretRef: "placeholder",
        isActive: true
      },
      brandConfig: {
        logoUrl: "",
        primaryColor: "#ff5722"
      }
    }, { merge: true });

    console.log('Adding sample categories...');
    for (const category of sampleCategories) {
      await addDoc(collection(getDb(), 'categories'), category);
    }

    console.log('Adding sample menu items...');
    for (const item of sampleMenuItems) {
      await addDoc(collection(getDb(), 'menu'), item);
    }

    console.log('Sample data added successfully!');
  } catch (error) {
    console.error('Error adding sample data:', error);
    throw error;
  }
};

// Run this once to populate data
// populateSampleData();