import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vortex.messenger',
  appName: 'Vortex',
  webDir: 'dist',
  android: {
    // Allow cleartext traffic to Supabase during development
    allowMixedContent: true,
    // Use resizes-content keyboard mode so AppBar never shifts
    // (mirrors interactive-widget=resizes-content in <meta viewport>)
    windowSoftInputMode: 'adjustResize',
  },
  server: {
    // Keep deep links working
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
