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
    FirebaseAuthentication: {
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
