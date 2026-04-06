import 'dotenv/config';

export default {
  expo: {
    name: 'Aroma del Rosal',
    slug: 'aroma-del-rosal',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#D11E51',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: false,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#D11E51',
      },
      package: 'com.aromadelrosal.app',
    },
    extra: {
      eas: {
        projectId: '90de6c3c-b5b0-43f3-9483-98d474eac35c',
      },
      WC_CONSUMER_KEY: process.env.WC_CONSUMER_KEY,
      WC_CONSUMER_SECRET: process.env.WC_CONSUMER_SECRET,
      WC_BASE_URL: process.env.WC_BASE_URL,
      WP_REST_URL: process.env.WP_REST_URL,
      FLAI_BASE_URL: process.env.FLAI_BASE_URL,
      FLAI_LOGIN: process.env.FLAI_LOGIN,
      FLAI_PASSWORD: process.env.FLAI_PASSWORD,
      FLAI_BYPASS: process.env.FLAI_BYPASS,
      AZUL_ENV: process.env.AZUL_ENV,
      AZUL_MERCHANT_ID: process.env.AZUL_MERCHANT_ID,
      AZUL_AUTH_KEY: process.env.AZUL_AUTH_KEY,
      AZUL_MERCHANT_NAME: process.env.AZUL_MERCHANT_NAME,
      AZUL_MERCHANT_TYPE: process.env.AZUL_MERCHANT_TYPE,
      AZUL_CURRENCY_CODE: process.env.AZUL_CURRENCY_CODE,
    },
  },
};
