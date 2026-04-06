import CryptoJS from 'crypto-js';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

const AZUL_CONFIG = {
  merchantId: extra.AZUL_MERCHANT_ID || '',
  authKey: extra.AZUL_AUTH_KEY || '',
  merchantName: extra.AZUL_MERCHANT_NAME || '',
  merchantType: extra.AZUL_MERCHANT_TYPE || 'ECommerce',
  currencyCode: extra.AZUL_CURRENCY_CODE || '$',
  env: extra.AZUL_ENV || 'test',
};

const URLS = {
  test: 'https://pruebas.azul.com.do/PaymentPage/Default.aspx',
  production: 'https://pagos.azul.com.do/PaymentPage/Default.aspx',
  productionAlt: 'https://contpagos.azul.com.do/PaymentPage/Default.aspx',
};

// Deep-link scheme URLs that the WebView will intercept
const CALLBACK_BASE = 'https://aromadelrosalinvestments.com/azul-callback';
const APPROVED_URL = `${CALLBACK_BASE}/approved`;
const DECLINED_URL = `${CALLBACK_BASE}/declined`;
const CANCEL_URL = `${CALLBACK_BASE}/cancelled`;

/**
 * Convert amount in pesos (e.g. 1500.50) to AZUL format (150050 — no decimals, cents included)
 */
function formatAmount(amount) {
  return parseInt(amount.toFixed(2).replace('.', ''), 10).toString();
}

/**
 * Generate HMAC-SHA512 hash for AZUL Payment Page authentication.
 * FIX: azul-invalid-auth-hash — root cause was plain SHA-512 instead of HMAC-SHA512.
 * Was: Crypto.digest(SHA512, utf16leBytes) — plain hash, no key → AuthHash mismatch.
 * Now: CryptoJS.HmacSHA512(utf16le_message, utf8_key) — matches AZUL spec exactly.
 *
 * AZUL spec (from technical doc):
 * - Message: all fields concatenated (including AuthKey appended at end), as UTF-16LE bytes
 * - HMAC key: AuthKey as UTF-8 bytes
 * - Algorithm: HMAC-SHA512
 * - Output: lowercase hex
 */
function generateAuthHash(fields) {
  const concatenated =
    fields.MerchantId +
    fields.MerchantName +
    fields.MerchantType +
    fields.CurrencyCode +
    fields.OrderNumber +
    fields.Amount +
    fields.ITBIS +
    fields.ApprovedUrl +
    fields.DeclinedUrl +
    fields.CancelUrl +
    fields.UseCustomField1 +
    fields.CustomField1Label +
    fields.CustomField1Value +
    fields.UseCustomField2 +
    fields.CustomField2Label +
    fields.CustomField2Value +
    AZUL_CONFIG.authKey;

  // Message encoded as UTF-16LE WordArray (matches C# default string encoding)
  const messageWords = CryptoJS.enc.Utf16LE.parse(concatenated);
  // HMAC key is the AuthKey as raw UTF-8 bytes
  const keyWords = CryptoJS.enc.Utf8.parse(AZUL_CONFIG.authKey);

  const hash = CryptoJS.HmacSHA512(messageWords, keyWords);
  return hash.toString(CryptoJS.enc.Hex);
}

/**
 * Validate the AuthHash returned by AZUL in the response.
 * FIX: azul-invalid-auth-hash — same root cause as generateAuthHash.
 * Was: plain SHA-512 → Now: HMAC-SHA512 with UTF-16LE message and UTF-8 key.
 */
function validateResponseHash(params) {
  const concatenated =
    (params.OrderNumber || '') +
    (params.Amount || '') +
    (params.AuthorizationCode || '') +
    (params.DateTime || '') +
    (params.ResponseCode || '') +
    (params.IsoCode || '') +
    (params.ResponseMessage || '') +
    (params.ErrorDescription || '') +
    (params.RRN || '') +
    AZUL_CONFIG.authKey;

  const messageWords = CryptoJS.enc.Utf16LE.parse(concatenated);
  const keyWords = CryptoJS.enc.Utf8.parse(AZUL_CONFIG.authKey);

  const hash = CryptoJS.HmacSHA512(messageWords, keyWords);
  return hash.toString(CryptoJS.enc.Hex).toLowerCase() === (params.AuthHash || '').toLowerCase();
}

/**
 * Build all payment parameters for AZUL Payment Page.
 * @param {string} orderNumber - Unique order identifier
 * @param {number} amount - Total in RD$ (e.g. 1500.50)
 * @returns {Promise<{fields: object, url: string}>}
 */
export async function buildPaymentRequest(orderNumber, amount) {
  const fields = {
    MerchantId: AZUL_CONFIG.merchantId,
    MerchantName: AZUL_CONFIG.merchantName,
    MerchantType: AZUL_CONFIG.merchantType,
    CurrencyCode: AZUL_CONFIG.currencyCode,
    OrderNumber: String(orderNumber),
    Amount: formatAmount(amount),
    ITBIS: '000',
    ApprovedUrl: APPROVED_URL,
    DeclinedUrl: DECLINED_URL,
    CancelUrl: CANCEL_URL,
    UseCustomField1: '0',
    CustomField1Label: '',
    CustomField1Value: '',
    UseCustomField2: '0',
    CustomField2Label: '',
    CustomField2Value: '',
    ShowTransactionResult: '0',
    SaveToDataVault: '0',
  };

  fields.AuthHash = generateAuthHash(fields);

  const url = AZUL_CONFIG.env === 'production' ? URLS.production : URLS.test;
  const altUrl = AZUL_CONFIG.env === 'production' ? URLS.productionAlt : URLS.test;

  return { fields, url, altUrl };
}

/**
 * Parse AZUL response from redirect URL query string.
 * @param {string} url - The full redirect URL with query params
 * @returns {object} Parsed response parameters
 */
export function parsePaymentResponse(url) {
  try {
    const queryString = url.includes('?') ? url.split('?')[1] : '';
    const params = {};
    queryString.split('&').forEach((pair) => {
      const [key, ...rest] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(rest.join('='));
      }
    });
    return params;
  } catch {
    return {};
  }
}

/**
 * Check if a URL is one of our AZUL callback URLs.
 * @param {string} url
 * @returns {'approved'|'declined'|'cancelled'|null}
 */
export function getCallbackType(url) {
  if (!url) return null;
  if (url.startsWith(APPROVED_URL)) return 'approved';
  if (url.startsWith(DECLINED_URL)) return 'declined';
  if (url.startsWith(CANCEL_URL)) return 'cancelled';
  return null;
}

export { validateResponseHash, APPROVED_URL, DECLINED_URL, CANCEL_URL };
