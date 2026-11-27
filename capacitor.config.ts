import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.blight.survivors2',
  appName: 'Blight Survivors 2',
  webDir: 'www',
  android: {
    backgroundColor: '#0a0a12',
    allowMixedContent: false,
    webContentsDebuggingEnabled: true
  }
};

export default config;