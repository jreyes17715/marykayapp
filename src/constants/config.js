import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export default {
  BASE_URL: extra.WC_BASE_URL || 'https://aromadelrosalinvestments.com/wp-json/wc/v3',
  WP_REST_URL: extra.WP_REST_URL || 'https://aromadelrosalinvestments.com/wp-json',
  JWT_TOKEN_ENDPOINT: (extra.WP_REST_URL || 'https://aromadelrosalinvestments.com/wp-json') + '/jwt-auth/v1/token',
  JWT_VALIDATE_ENDPOINT: (extra.WP_REST_URL || 'https://aromadelrosalinvestments.com/wp-json') + '/jwt-auth/v1/token/validate',
  CONSUMER_KEY: extra.WC_CONSUMER_KEY || '',
  CONSUMER_SECRET: extra.WC_CONSUMER_SECRET || '',
  APP_NAME: 'Mary Kay',
  CURRENCY_SYMBOL: 'RD$',
  CURRENCY_NAME: 'Pesos Dominicanos',
  COUNTRY_CODE: 'DO',
};
