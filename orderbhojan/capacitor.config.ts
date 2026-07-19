import type { CapacitorConfig } from '@capacitor/cli';



const config: CapacitorConfig = {

  appId: 'com.bhojanos.orderbhojan',

  appName: 'OrderBhojan',

  webDir: 'dist',

  bundledWebRuntime: false,

  plugins: {

    SplashScreen: {

      launchAutoHide: false,

      backgroundColor: '#070504',

      showSpinner: false,

    },

    StatusBar: {

      style: 'DARK',

      backgroundColor: '#070504',

      overlaysWebView: true,

    },

    PushNotifications: {

      presentationOptions: ['badge', 'sound', 'alert'],

    },

    FirebaseAuthentication: {

      // Native Google sign-in returns id_token for Firebase JS SDK (skipNativeAuth).

      // google-services.json must be from bhojanos-prod so token audience matches web Auth.

      authDomain: 'bhojanos-prod.firebaseapp.com',

      skipNativeAuth: true,

      providers: ['google.com', 'phone'],

    },

  },

  ios: {

    contentInset: 'automatic',

    scrollEnabled: true,

  },

  server: {

    // Android WebView origin is https://localhost (must match backend CORS allowlist).

    androidScheme: 'https',

    hostname: 'localhost',

  },

  android: {

    allowMixedContent: false,

  },

};



export default config;


