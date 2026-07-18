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
    },
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
