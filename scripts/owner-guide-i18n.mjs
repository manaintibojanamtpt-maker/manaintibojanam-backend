/** Trilingual content for BhojanOS Owner Guide (EN / HI / TE) */

export const meta = {
  version: '1.2',
  date: 'June 2026',
  support: 'bhojanos26@gmail.com',
  website: 'https://www.bhojanos.com',
};

export const cover = {
  title: { en: 'BhojanOS', hi: 'भोजनOS', te: 'భోజనOS' },
  subtitle: {
    en: 'Complete Owner & Operations Guide',
    hi: 'पूर्ण मालिक एवं संचालन मार्गदर्शिका',
    te: 'సంపూర్ణ యజమాని & ఆపరేషన్స్ గైడ్',
  },
  tagline: {
    en: 'Technology · Installation · Onboarding · Every feature · Customer order to delivery',
    hi: 'तकनीक · इंस्टॉलेशन · ऑनबोर्डिंग · सभी फीचर · ग्राहक ऑर्डर से डिलीवरी तक',
    te: 'టెక్నాలజీ · ఇన్‌స్టాలేషన్ · ఆన్‌బోర్డింగ్ · ప్రతి ఫీచర్ · కస్టమర్ ఆర్డర్ నుండి డెలివరీ వరకు',
  },
  audience: {
    en: 'For restaurant owners, cloud kitchens & food entrepreneurs',
    hi: 'रेस्तरां मालिकों, क्लाउड किचन और फूड उद्यमियों के लिए',
    te: 'రెస్టారెంట్ యజమానులు, క్లౌడ్ కిచెన్లు & ఫుడ్ వ్యవస్థాపకుల కోసం',
  },
};

export const screenshots = [
  {
    file: '01-marketing-home.png',
    caption: {
      en: 'BhojanOS marketing home — start your free storefront',
      hi: 'भोजनOS मार्केटिंग होम — अपना मुफ्त स्टोरफ्रंट शुरू करें',
      te: 'భోజనOS మార్కెటింగ్ హోమ్ — మీ ఉచిత స్టోర్‌ఫ్రంట్ ప్రారంభించండి',
    },
  },
  {
    file: '02-onboard.png',
    caption: {
      en: 'Onboarding landing page (/onboard)',
      hi: 'ऑनबोर्डिंग लैंडिंग पेज',
      te: 'ఆన్‌బోర్డింగ్ ల్యాండింగ్ పేజీ',
    },
  },
  {
    file: '03-pricing.png',
    caption: {
      en: 'Pricing — free storefront, Growth for live orders',
      hi: 'मूल्य निर्धारण — मुफ्त स्टोरफ्रंट, लाइव ऑर्डर के लिए Growth',
      te: 'ధరలు — ఉచిత స్టోర్‌ఫ్రంట్, లైవ్ ఆర్డర్లకు Growth',
    },
  },
  {
    file: '04-owner-login.png',
    caption: {
      en: 'Owner sign-in — fast lightweight login page',
      hi: 'मालिक साइन-इन — तेज़ लॉगिन पेज',
      te: 'యజమాని సైన్-ఇన్ — వేగవంతమైన లాగిన్ పేజీ',
    },
  },
  {
    file: '05-owner-register.png',
    caption: {
      en: 'Owner registration — create your kitchen store',
      hi: 'मालिक पंजीकरण — अपना किचन स्टोर बनाएं',
      te: 'యజమాని నమోదు — మీ కిచెన్ స్టోర్ సృష్టించండి',
    },
  },
  {
    file: '06-storefront.png',
    caption: {
      en: 'Customer storefront — branded menu at /k/{slug}',
      hi: 'ग्राहक स्टोरफ्रंट — /k/{slug} पर ब्रांडेड मेनू',
      te: 'కస్టమర్ స్టోర్‌ఫ్రంట్ — /k/{slug} వద్ద బ్రాండెడ్ మెనూ',
    },
  },
];

export const sections = [
  {
    id: 'welcome',
    title: {
      en: '1. Welcome to BhojanOS',
      hi: '1. भोजनOS में आपका स्वागत है',
      te: '1. భోజనOS కు స్వాగతం',
    },
    body: {
      en: 'BhojanOS is a restaurant operating system with your branded online store, owner dashboard, orders, delivery tools, and growth intelligence — zero commission on every order. Storefront setup is free; live orders need Growth plan (14-day trial at publish).',
      hi: 'भोजनOS एक रेस्तरां ऑपरेटिंग सिस्टम है — आपका ब्रांडेड ऑनलाइन स्टोर, मालिक डैशबोर्ड, ऑर्डर, डिलीवरी टूल और ग्रोथ इंटेलिजेंस। हर ऑर्डर पर शून्य कमीशन। स्टोरफ्रंट सेटअप मुफ्त; लाइव ऑर्डर के लिए Growth प्लान (प्रकाशन पर 14-दिन का ट्रायल)।',
      te: 'భోజనOS అనేది మీ బ్రాండెడ్ ఆన్‌లైన్ స్టోర్, యజమాని డాష్‌బోర్డ్, ఆర్డర్లు, డెలివరీ టూల్స్ మరియు గ్రోత్ ఇంటెలిజెన్స్‌తో రెస్టారెంట్ ఆపరేటింగ్ సిస్టమ్ — ప్రతి ఆర్డర్‌పై సున్నా కమిషన్. స్టోర్‌ఫ్రంట్ సెటప్ ఉచితం; లైవ్ ఆర్డర్లకు Growth ప్లాన్ (ప్రచురణపై 14-రోజుల ట్రయల్).',
    },
    bullets: {
      en: [
        'Platform technology & cloud architecture',
        'PWA installation on your phone',
        'Account creation & 8-step store setup',
        'All owner portal screens explained',
        'Plans, trials & feature access',
        'Customer journey from menu to delivery',
      ],
      hi: [
        'प्लेटफॉर्म तकनीक और क्लाउड आर्किटेक्चर',
        'फोन पर PWA इंस्टॉलेशन',
        'खाता बनाना और 8-चरणीय स्टोर सेटअप',
        'सभी मालिक पोर्टल स्क्रीन की व्याख्या',
        'प्लान, ट्रायल और फीचर एक्सेस',
        'मेनू से डिलीवरी तक ग्राहक यात्रा',
      ],
      te: [
        'ప్లాట్‌ఫారమ్ టెక్నాలజీ & క్లౌడ్ ఆర్కిటెక్చర్',
        'మీ ఫోన్‌లో PWA ఇన్‌స్టాలేషన్',
        'ఖాతా సృష్టి & 8-దశల స్టోర్ సెటప్',
        'అన్ని యజమాని పోర్టల్ స్క్రీన్ల వివరణ',
        'ప్లాన్లు, ట్రయల్స్ & ఫీచర్ యాక్సెస్',
        'మెనూ నుండి డెలివరీ వరకు కస్టమర్ ప్రయాణం',
      ],
    },
  },
  {
    id: 'install',
    title: {
      en: '2. Install BhojanOS on Your Phone (PWA)',
      hi: '2. अपने फोन पर भोजनOS इंस्टॉल करें (PWA)',
      te: '2. మీ ఫోన్‌లో భోజనOS ఇన్‌స్టాల్ చేయండి (PWA)',
    },
    body: {
      en: 'Install BhojanOS like a native app for fast access and order alerts — no app store needed.',
      hi: 'तेज़ एक्सेस और ऑर्डर अलर्ट के लिए भोजनOS को नेटिव ऐप की तरह इंस्टॉल करें — ऐप स्टोर की जरूरत नहीं।',
      te: 'వేగవంతమైన యాక్సెస్ మరియు ఆర్డర్ అలర్ట్ల కోసం భోజనOS ను నేటివ్ యాప్‌లా ఇన్‌స్టాల్ చేయండి — యాప్ స్టోర్ అవసరం లేదు.',
    },
    bullets: {
      en: [
        'Android Chrome: Menu → Install app / Add to Home screen',
        'iPhone Safari: Share → Add to Home Screen',
        'Desktop: Install icon in address bar',
        'Accept update prompt when new version ships',
      ],
      hi: [
        'Android Chrome: मेनू → Install app / Add to Home screen',
        'iPhone Safari: Share → Add to Home Screen',
        'डेस्कटॉप: एड्रेस बार में Install आइकन',
        'नया वर्जन आने पर अपडेट प्रॉम्प्ट स्वीकार करें',
      ],
      te: [
        'Android Chrome: మెనూ → Install app / Add to Home screen',
        'iPhone Safari: Share → Add to Home Screen',
        'డెస్క్‌టాప్: అడ్రస్ బార్‌లో Install చిహ్నం',
        'కొత్త వెర్షన్ వచ్చినప్పుడు అప్‌డేట్ ప్రాంప్ట్ అంగీకరించండి',
      ],
    },
    screenshot: '04-owner-login.png',
  },
  {
    id: 'register',
    title: {
      en: '3. Owner Registration & Login',
      hi: '3. मालिक पंजीकरण और लॉगिन',
      te: '3. యజమాని నమోదు & లాగిన్',
    },
    body: {
      en: 'Register at bhojanos.com/owner/register with name, restaurant name, email & password. System creates your tenant and links it to your profile. Login at /owner/login — you go directly to Dashboard.',
      hi: 'bhojanos.com/owner/register पर नाम, रेस्तरां नाम, ईमेल और पासवर्ड से पंजीकरण करें। सिस्टम आपका टेनेंट बनाता है। /owner/login पर लॉगिन — सीधे डैशबोर्ड पर जाएं।',
      te: 'bhojanos.com/owner/register వద్ద పేరు, రెస్టారెంట్ పేరు, ఇమెయిల్ & పాస్‌వర్డ్‌తో నమోదు చేయండి. సిస్టమ్ మీ టెనెంట్ సృష్టిస్తుంది. /owner/login — నేరుగా డాష్‌బోర్డ్‌కు.',
    },
    bullets: {
      en: [
        'Google sign-in supported',
        '14-day Growth trial starts when you publish',
        'No credit card required to start',
      ],
      hi: [
        'Google साइन-इन समर्थित',
        'प्रकाशन पर 14-दिन का Growth ट्रायल शुरू',
        'शुरू करने के लिए क्रेडिट कार्ड की जरूरत नहीं',
      ],
      te: [
        'Google సైన్-ఇన్ మద్దతు',
        'ప్రచురణపై 14-రోజుల Growth ట్రయల్ ప్రారంభం',
        'ప్రారంభించడానికి క్రెడిట్ కార్డ్ అవసరం లేదు',
      ],
    },
    screenshot: '05-owner-register.png',
  },
  {
    id: 'setup',
    title: {
      en: '4. Store Setup — 8 Guided Steps (~25 min)',
      hi: '4. स्टोर सेटअप — 8 मार्गदर्शित चरण (~25 मिनट)',
      te: '4. స్టోర్ సెటప్ — 8 మార్గదర్శక దశలు (~25 నిమి)',
    },
    setupSteps: [
      {
        en: 'Confirm account',
        hi: 'खाता पुष्टि',
        te: 'ఖాతా నిర్ధారణ',
      },
      {
        en: 'Name your kitchen',
        hi: 'किचन का नाम',
        te: 'కిచెన్ పేరు',
      },
      {
        en: 'Add address',
        hi: 'पता जोड़ें',
        te: 'చిరునామా జోడించండి',
      },
      {
        en: 'Delivery zones (km)',
        hi: 'डिलीवरी ज़ोन (किमी)',
        te: 'డెలివరీ జోన్లు (కి.మీ)',
      },
      {
        en: 'Payments (COD/Razorpay)',
        hi: 'भुगतान (COD/Razorpay)',
        te: 'చెల్లింపులు (COD/Razorpay)',
      },
      {
        en: 'Menu (min 3 items)',
        hi: 'मेनू (कम से कम 3 आइटम)',
        te: 'మెనూ (కనీసం 3 అంశాలు)',
      },
      {
        en: 'Mobile verify (optional)',
        hi: 'मोबाइल सत्यापन (वैकल्पिक)',
        te: 'మొబైల్ ధృవీకరణ (ఐచ్ఛికం)',
      },
      {
        en: 'Publish store — Go live!',
        hi: 'स्टोर प्रकाशित करें — लाइव!',
        te: 'స్టోర్ ప్రచురించండి — లైవ్!',
      },
    ],
    body: {
      en: 'Complete steps on Dashboard via Store Setup Guide or /owner/setup wizard. Publish activates 14-day Growth trial.',
      hi: 'डैशबोर्ड पर Store Setup Guide या /owner/setup विज़ार्ड से चरण पूरे करें। प्रकाशन 14-दिन का Growth ट्रायल सक्रिय करता है।',
      te: 'డాష్‌బోర్డ్‌లో Store Setup Guide లేదా /owner/setup విజార్డ్ ద్వారా దశలు పూర్తి చేయండి. ప్రచురణ 14-రోజుల Growth ట్రయల్‌ను సక్రియం చేస్తుంది.',
    },
  },
  {
    id: 'dashboard',
    title: {
      en: '5. Owner Dashboard & Key Features',
      hi: '5. मालिक डैशबोर्ड और मुख्य फीचर',
      te: '5. యజమాని డాష్‌బోర్డ్ & ముఖ్య ఫీచర్లు',
    },
    features: [
      {
        path: '/owner/dashboard',
        en: 'Dashboard — setup guide, live toggle, KPIs, share store',
        hi: 'डैशबोर्ड — सेटअप गाइड, लाइव टॉगल, KPI, स्टोर शेयर',
        te: 'డాష్‌బోర్డ్ — సెటప్ గైడ్, లైవ్ టాగిల్, KPIలు, స్టోర్ షేర్',
      },
      {
        path: '/owner/orders',
        en: 'Orders — real-time queue, accept → prepare → dispatch → deliver',
        hi: 'ऑर्डर — रियल-टाइम कतार, स्वीकार → तैयारी → डिस्पैच → डिलीवर',
        te: 'ఆర్డర్లు — రియల్-టైమ్ క్యూ, అంగీకరించు → తయారు → డిస్పాచ్ → డెలివర్',
      },
      {
        path: '/owner/menu',
        en: 'Menu Builder — add dishes, photos, prices, categories',
        hi: 'मेनू बिल्डर — व्यंजन, फोटो, कीमत, श्रेणियां',
        te: 'మెనూ బిల్డర్ — వంటకాలు, ఫోటోలు, ధరలు, వర్గాలు',
      },
      {
        path: '/owner/settings',
        en: 'Storefront — logo, hours, location, fees, promotions',
        hi: 'स्टोरफ्रंट — लोगो, समय, स्थान, शुल्क, प्रमोशन',
        te: 'స్టోర్‌ఫ్రంట్ — లోగో, గంటలు, స్థానం, ఫీజులు, ప్రమోషన్లు',
      },
      {
        path: '/owner/kyc',
        en: 'Compliance (KYC) — declaration, identity, FSSAI documents',
        hi: 'अनुपालन (KYC) — घोषणा, पहचान, FSSAI दस्तावेज',
        te: 'కంప్లయన్స్ (KYC) — ప్రకటన, గుర్తింపు, FSSAI పత్రాలు',
      },
      {
        path: '/owner/marketing',
        en: 'Growth campaigns — segments, WhatsApp/SMS copy (Growth plan)',
        hi: 'ग्रोथ अभियान — सेगमेंट, WhatsApp/SMS कॉपी (Growth प्लान)',
        te: 'గ్రోత్ ప్రచారాలు — సెగ్మెంట్లు, WhatsApp/SMS కాపీ (Growth ప్లాన్)',
      },
      {
        path: '/owner/subscription',
        en: 'Plans — Starter free, Growth ₹999, Pro ₹2999, Enterprise ₹4999',
        hi: 'प्लान — Starter मुफ्त, Growth ₹999, Pro ₹2999, Enterprise ₹4999',
        te: 'ప్లాన్లు — Starter ఉచితం, Growth ₹999, Pro ₹2999, Enterprise ₹4999',
      },
    ],
  },
  {
    id: 'customer',
    title: {
      en: '6. Customer Journey — Order to Delivery',
      hi: '6. ग्राहक यात्रा — ऑर्डर से डिलीवरी',
      te: '6. కస్టమర్ ప్రయాణం — ఆర్డర్ నుండి డెలివరీ',
    },
    body: {
      en: 'Customers visit your store at bhojanos.com/k/{slug}, browse menu, add to cart, checkout with address & payment, then track order live until delivery.',
      hi: 'ग्राहक bhojanos.com/k/{slug} पर आपके स्टोर पर जाते हैं, मेनू देखते हैं, कार्ट में जोड़ते हैं, चेकआउट करते हैं, फिर डिलीवरी तक ऑर्डर ट्रैक करते हैं।',
      te: 'కస్టమర్లు bhojanos.com/k/{slug} వద్ద మీ స్టోర్‌ను సందర్శిస్తారు, మెనూ చూస్తారు, కార్ట్‌కు జోడిస్తారు, చెక్అవుట్ చేస్తారు, డెలివరీ వరకు ఆర్డర్ ట్రాక్ చేస్తారు.',
    },
    flow: {
      en: [
        'Browse Home & Menu',
        'Add to cart',
        'Checkout — address, slot, promo',
        'Pay — COD or Razorpay',
        'Track order live',
        'Delivered!',
      ],
      hi: [
        'होम और मेनू देखें',
        'कार्ट में जोड़ें',
        'चेकआउट — पता, स्लॉट, प्रोमो',
        'भुगतान — COD या Razorpay',
        'लाइव ऑर्डर ट्रैक',
        'डिलीवर!',
      ],
      te: [
        'హోమ్ & మెనూ బ్రౌజ్ చేయండి',
        'కార్ట్‌కు జోడించండి',
        'చెక్అవుట్ — చిరునామా, స్లాట్, ప్రోమో',
        'చెల్లించండి — COD లేదా Razorpay',
        'లైవ్ ఆర్డర్ ట్రాక్',
        'డెలివర్ అయింది!',
      ],
    },
    screenshot: '06-storefront.png',
  },
  {
    id: 'operations',
    title: {
      en: '7. Daily Operations & Going Live',
      hi: '7. दैनिक संचालन और लाइव होना',
      te: '7. రోజువారీ ఆపరేషన్స్ & లైవ్ అవ్వడం',
    },
    bullets: {
      en: [
        'Publish once in setup wizard — starts Growth trial',
        'Store Live Control on Dashboard — ON/OFF orders daily',
        'Share link: bhojanos.com/k/your-slug on WhatsApp & social',
        'Accept orders → Prepare → Dispatch rider → Mark delivered',
        'Zero commission on all plans',
      ],
      hi: [
        'सेटअप विज़ार्ड में एक बार प्रकाशित करें — Growth ट्रायल शुरू',
        'डैशबोर्ड पर Store Live Control — रोज़ ऑर्डर ON/OFF',
        'WhatsApp पर लिंक शेयर करें: bhojanos.com/k/your-slug',
        'ऑर्डर स्वीकारें → तैयारी → राइडर डिस्पैच → डिलीवर मार्क',
        'सभी प्लान पर शून्य कमीशन',
      ],
      te: [
        'సెటప్ విజార్డ్‌లో ఒకసారి ప్రచురించండి — Growth ట్రయల్ ప్రారంభం',
        'డాష్‌బోర్డ్‌లో Store Live Control — రోజువారీ ఆర్డర్లు ON/OFF',
        'WhatsAppలో లింక్ షేర్: bhojanos.com/k/your-slug',
        'ఆర్డర్లు అంగీకరించండి → తయారు → రైడర్ డిస్పాచ్ → డెలివర్ మార్క్',
        'అన్ని ప్లాన్లపై సున్నా కమిషన్',
      ],
    },
  },
  {
    id: 'support',
    title: {
      en: '8. Support & Quick Start Checklist',
      hi: '8. सहायता और त्वरित प्रारंभ चेकलिस्ट',
      te: '8. మద్దతు & త్వరిత ప్రారంభ చెక్‌లిస్ట్',
    },
    checklist: {
      en: [
        'Register → Install PWA → Complete 8 setup steps',
        'Add 3+ menu items with photos & prices',
        'Enable COD → Publish → Turn ON Live Control',
        'Share store link → Accept test order',
        'Complete KYC → Enable Razorpay',
        'Help: bhojanos26@gmail.com or /owner/feedback',
      ],
      hi: [
        'पंजीकरण → PWA इंस्टॉल → 8 सेटअप चरण पूरे करें',
        '3+ मेनू आइटम फोटो और कीमत के साथ',
        'COD सक्षम → प्रकाशित → Live Control ON',
        'स्टोर लिंक शेयर → टेस्ट ऑर्डर स्वीकारें',
        'KYC पूरा → Razorpay सक्षम',
        'सहायता: bhojanos26@gmail.com या /owner/feedback',
      ],
      te: [
        'నమోదు → PWA ఇన్‌స్టాల్ → 8 సెటప్ దశలు పూర్తి',
        '3+ మెనూ అంశాలు ఫోటోలు & ధరలతో',
        'COD ప్రారంభించండి → ప్రచురించండి → Live Control ON',
        'స్టోర్ లింక్ షేర్ → టెస్ట్ ఆర్డర్ అంగీకరించండి',
        'KYC పూర్తి → Razorpay ప్రారంభించండి',
        'సహాయం: bhojanos26@gmail.com లేదా /owner/feedback',
      ],
    },
  },
];

export const langs = [
  { code: 'en', label: 'English', fontClass: 'lang-en' },
  { code: 'hi', label: 'हिन्दी', fontClass: 'lang-hi' },
  { code: 'te', label: 'తెలుగు', fontClass: 'lang-te' },
];
