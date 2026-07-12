/**

 * Sprint 19 — seed demo storefront tenant + menu for Firestore-backed marketplace.

 * Usage: npm run seed:storefront -- [tenantSlug]

 */

import { FieldValue } from 'firebase-admin/firestore';

import { FirebaseAdminProvider } from '../backend-lib/firebase/FirebaseAdminProvider.js';



const slug = process.argv[2] ?? 'demo-biryani-house';



async function main() {

  const provider = await FirebaseAdminProvider.initialize();

  const db = provider.getFirestore();



  const tenantRef = db.collection('tenants').doc(slug);



  await tenantRef.set(

    {

      name: 'Demo Biryani House',

      slug,

      status: 'active',

      storeStatus: 'published',

      cuisineTags: ['Biryani', 'Hyderabadi', 'Non-Veg'],

      branding: {

        logoUrl: 'https://cdn.bhojan.app/demo/biryani-logo.png',

        coverUrl: 'https://cdn.bhojan.app/demo/biryani-cover.jpg',

      },

      location: {
        lat: 17.4401,
        lng: 78.3489,
        city: 'Hyderabad',
        state: 'Telangana',
      },

      storeOperations: {

        isStoreOpen: true,

        businessHoursEnabled: true,

        openTime: '11:00',

        closeTime: '23:00',

      },

      deliveryConfig: {

        prepTime: 25,

        deliveryFee: 29,

        enabled: true,

        feesConfigured: true,

        baseFee: 29,

        maxRadius: 12,

      },

      marketplace: {

        publicRestaurantId: 'obr_demo_biryani_001',

        tagline: 'Authentic Hyderabadi dum biryani',

        description:

          'Demo Biryani House serves slow-cooked dum biryani, kebabs, and Hyderabad classics with sealed delivery.',

        cuisineTags: ['Biryani', 'Hyderabadi'],

        priceBandLabel: '₹₹',

        priceForTwo: 499,

        rating: 4.8,

        ratingCount: 1240,

        deliveryFee: 29,

        featuredFoodIds: [],

        todaysSpecialFoodIds: [],

        theme: {

          primaryColor: '#E85D04',

          logoUrl: 'https://cdn.bhojan.app/demo/biryani-logo.png',

          coverUrl: 'https://cdn.bhojan.app/demo/biryani-cover.jpg',

        },

        businessHours: {

          todayHoursLabel: '11:00 AM – 11:00 PM',

          weeklyHours: [{ day: 'Mon–Sun', open: '11:00 AM', close: '11:00 PM', isToday: true }],

        },

        gallery: [

          {

            galleryId: 'gal_1',

            url: 'https://cdn.bhojan.app/demo/biryani-1.jpg',

            caption: 'Dum biryani service',

            sortOrder: 0,

          },

          {

            galleryId: 'gal_2',

            url: 'https://cdn.bhojan.app/demo/biryani-2.jpg',

            caption: 'Charcoal kebabs',

            sortOrder: 1,

          },

        ],

        offers: [

          {

            offerId: 'offer_weekend',

            enabled: true,

            displayText: '50% OFF up to ₹100',

            description: 'On orders above ₹299',

            badge: 'Best deal',

            priority: 1,

            type: 'percentage',

          },

          {

            offerId: 'offer_delivery',

            enabled: true,

            displayText: 'Free delivery',

            description: 'Weekend special',

            badge: 'Free delivery',

            priority: 2,

            type: 'free_delivery',

          },

        ],

        highlights: [

          { id: 'h1', title: 'Verified kitchen', subtitle: 'FSSAI compliant' },

          { id: 'h2', title: 'Popular for biryani', subtitle: '1200+ ratings' },

        ],

        policies: [

          {

            id: 'p1',

            title: 'Packaging',

            body: 'Eco-friendly containers with sealed delivery bags.',

          },

        ],

      },

      updatedAt: FieldValue.serverTimestamp(),

    },

    { merge: true },

  );



  const menuItems = [

    {

      name: 'Hyderabadi Chicken Biryani',

      category: 'Biryani',

      categoryId: 'cat-biryani',

      price: 299,

      type: 'non-veg',

      description: 'Slow-cooked dum biryani with raita and salan',

      isAvailable: true,

      displayOrder: 0,

      labels: [

        { kind: 'BESTSELLER', displayText: 'Bestseller' },

        { kind: 'CHEF_PICK', displayText: 'Chef recommended' },

      ],

      offer: {

        displayText: '₹50 off this weekend',

        badge: 'Weekend',

        type: 'flat_amount',

        priority: 1,

        sellingPrice: 249,

      },

      spiceLevel: 'medium',

      preparationMinutes: 25,

      chefNote: 'Sealed dum for 45 minutes — basmati stays fluffy.',

      variants: [

        { variantId: 'v-half', kind: 'half', displayName: 'Half', price: 199, offerPrice: 169, sortOrder: 0 },

        { variantId: 'v-full', kind: 'full', displayName: 'Full', price: 299, offerPrice: 249, sortOrder: 1 },

      ],

    },

    {

      name: 'Paneer Biryani',

      category: 'Biryani',

      categoryId: 'cat-biryani',

      price: 219,

      type: 'veg',

      description: 'Fragrant basmati with soft paneer cubes',

      isAvailable: true,

      displayOrder: 1,

      offer: {

        displayText: 'Special price',

        type: 'flat_amount',

        sellingPrice: 199,

      },

    },

    {

      name: 'Special Raita',

      category: 'Sides',

      categoryId: 'cat-sides',

      price: 49,

      type: 'veg',

      description: 'Cooling onion-tomato raita',

      isAvailable: true,

      displayOrder: 2,

    },

  ];



  const existing = await db.collection('menu').where('tenantId', '==', slug).get();

  const existingNames = new Set(existing.docs.map((doc) => String(doc.data().name).toLowerCase()));



  let seeded = 0;

  for (const item of menuItems) {

    if (existingNames.has(item.name.toLowerCase())) continue;

    await db.collection('menu').add({

      tenantId: slug,

      ...item,

      createdAt: FieldValue.serverTimestamp(),

      updatedAt: FieldValue.serverTimestamp(),

    });

    seeded += 1;

  }



  const menuSnapshot = await db.collection('menu').where('tenantId', '==', slug).get();

  const featuredIds = menuSnapshot.docs

    .filter((doc) => {

      const labels = doc.data().labels as { kind: string }[] | undefined;

      return labels?.some((l) => l.kind === 'BESTSELLER' || l.kind === 'CHEF_PICK');

    })

    .map((doc) => doc.id);



  const specialIds = menuSnapshot.docs

    .filter((doc) => doc.data().offer?.displayText)

    .map((doc) => doc.id)

    .slice(0, 3);



  await tenantRef.set(

    {

      marketplace: {

        featuredFoodIds: featuredIds,

        todaysSpecialFoodIds: specialIds,

      },

    },

    { merge: true },

  );



  console.log(`Seeded tenant "${slug}" with ${seeded} new menu item(s).`);

}



main().catch((error) => {

  console.error(error);

  process.exit(1);

});


