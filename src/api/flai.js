/**
 * API del sistema externo FLAI para verificación de stock y reservas.
 * Sesión por cookie; re-autenticación si expira.
 */

import axios from 'axios';
import Constants from 'expo-constants';

function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const extra = Constants.expoConfig?.extra || {};

// FLAI bypass: controlado por variable de entorno.
// Auto-bypass si no hay credenciales configuradas.
function resolveBypass() {
  const envBypass = extra.FLAI_BYPASS;
  if (envBypass === 'false' || envBypass === false) return false;
  if (envBypass === 'true' || envBypass === true) return true;
  // Auto-bypass si no hay credenciales
  const login = extra.FLAI_LOGIN || '';
  const password = extra.FLAI_PASSWORD || '';
  if (!login || !password) return true;
  // Default: bypass activo
  return true;
}

export const FLAI_BYPASS = resolveBypass();

const FLAI_BASE = extra.FLAI_BASE_URL || 'https://cel.flai.com.do';
const TIMEOUT_MS = 15000;
const FLAI_LOGIN = extra.FLAI_LOGIN || '';
const FLAI_PASSWORD = extra.FLAI_PASSWORD || '';

let sessionCookie = null;

const client = axios.create({
  baseURL: FLAI_BASE,
  timeout: TIMEOUT_MS,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.response.use((response) => {
  const cookie = getCookieFromResponse(response);
  if (cookie) {
    sessionCookie = cookie;
  }
  return response;
});

function getCookieFromResponse(response) {
  const setCookie = response.headers['set-cookie'];
  if (!setCookie) return null;
  if (Array.isArray(setCookie)) return setCookie.join('; ');
  return String(setCookie);
}

function requestConfig() {
  const config = {};
  if (sessionCookie) config.headers = { Cookie: sessionCookie };
  return config;
}

/**
 * Autenticación FLAI. Guarda la cookie de sesión internamente.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function flaiAuth() {
  try {
    const { data, headers } = await client.post('/api/exo/auth/sign_in/', {
      login: FLAI_LOGIN,
      password: FLAI_PASSWORD,
    });
    const cookie = getCookieFromResponse({ headers });
    if (cookie) {
      sessionCookie = cookie;
      return { success: true };
    }
    return { success: false, error: 'No se recibió sesión de FLAI' };
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Error al conectar con FLAI';
    return { success: false, error: msg };
  }
}

/**
 * Verifica disponibilidad de productos.
 * @param {Array<{ product_name: string, default_code: string, add_qty: number }>} products
 * @returns {Promise<{ success: boolean, products?: Array<{ default_code: string, qtyRemain: number }>, error?: string }>}
 */
export async function checkAvailability(products) {
  if (FLAI_BYPASS) {
    console.log('[FLAI] Bypass activo - saltando verificación de stock');
    return { success: true, products: [] };
  }
  if (!products || products.length === 0) {
    return { success: true, products: [] };
  }
  try {
    if (!sessionCookie) {
      const auth = await flaiAuth();
      if (!auth.success) return { success: false, error: auth.error };
    }
    const res = await client.post(
      '/api/products/availability/',
      { params: { products } },
      { ...requestConfig(), timeout: TIMEOUT_MS }
    );
    const list = res.data?.products;
    if (!Array.isArray(list)) return { success: false, error: 'Respuesta inválida de FLAI' };
    return { success: true, products: list };
  } catch (err) {
    if (err.response?.status === 401) {
      sessionCookie = null;
      const auth = await flaiAuth();
      if (!auth.success) return { success: false, error: auth.error };
      return checkAvailability(products);
    }
    const msg = err.response?.data?.message || err.message || 'Error al verificar disponibilidad';
    return { success: false, error: msg };
  }
}

/**
 * Crea una reserva en FLAI.
 * @param {Array<{ product_name: string, default_code: string, add_qty: number }>} products
 * @param {Object} userData - { fullName, email, phone, address }
 * @returns {Promise<{ success: boolean, orderId?: number, error?: string }>}
 */
export async function createReservation(products, userData = {}) {
  if (FLAI_BYPASS) {
    console.log('[FLAI] Bypass activo - saltando creación de reserva');
    return { success: true, orderId: 'BYPASS_' + Date.now() };
  }
  if (!products || products.length === 0) {
    return { success: false, error: 'No hay productos para reservar' };
  }
  try {
    if (!sessionCookie) {
      const auth = await flaiAuth();
      if (!auth.success) return { success: false, error: auth.error };
    }
    const orderRef = `mk_app_${Date.now()}`;
    const body = {
      params: {
        json: {
          products,
          user_id: userData.userId || 1,
          additionalInfo: {
            client_order_ref: orderRef,
            client: {
              id: userData.userId || 1,
              full_name: userData.fullName || 'Cliente',
              phone: userData.phone || '',
              mobile: userData.phone || '',
              latitude: 0,
              longitude: 0,
              fulladress: userData.address || 'Por confirmar',
            },
          },
        },
      },
    };
    const res = await client.post('/api/cart/products/user/', body, {
      ...requestConfig(),
      timeout: TIMEOUT_MS,
    });
    const orderId = res.data?.orderId;
    if (orderId == null) return { success: false, error: 'FLAI no devolvió orderId' };
    return { success: true, orderId: Number(orderId) };
  } catch (err) {
    if (err.response?.status === 401) {
      sessionCookie = null;
      const auth = await flaiAuth();
      if (!auth.success) return { success: false, error: auth.error };
      return createReservation(products, userData);
    }
    const msg = err.response?.data?.message || err.message || 'Error al crear la reserva';
    return { success: false, error: msg };
  }
}

/**
 * Cancela una reserva en FLAI.
 * @param {number|string} orderId - ID de la reserva a cancelar
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function cancelReservation(orderId) {
  if (FLAI_BYPASS) {
    return { success: true };
  }
  if (!orderId) {
    return { success: false, error: 'No hay reserva que cancelar' };
  }
  try {
    if (!sessionCookie) {
      const auth = await flaiAuth();
      if (!auth.success) return { success: false, error: auth.error };
    }
    await client.post(
      '/api/cart/products/cancel/',
      { params: { order_id: orderId } },
      { ...requestConfig(), timeout: TIMEOUT_MS }
    );
    return { success: true };
  } catch (err) {
    if (err.response?.status === 401) {
      sessionCookie = null;
      const auth = await flaiAuth();
      if (!auth.success) return { success: false, error: auth.error };
      return cancelReservation(orderId);
    }
    const msg = err.response?.data?.message || err.message || 'Error al cancelar reserva';
    return { success: false, error: msg };
  }
}

/**
 * Convierte ítems del carrito a formato FLAI (solo con SKU y precio > 0).
 * Excluye productos sin SKU y productos regalo (precio 0).
 * @param {Array<{ product: object, quantity: number }>} cartItems
 * @returns {Array<{ product_name: string, default_code: string, add_qty: number }>}
 */
export function cartItemsToFlaiProducts(cartItems) {
  if (!Array.isArray(cartItems)) return [];
  const out = [];
  for (const { product, quantity } of cartItems) {
    const sku = product?.sku;
    if (!sku || String(sku).trim() === '') continue;
    const price = parseFloat(product?.price || product?.regular_price || 0) || 0;
    if (price <= 0) continue;
    const name = (product?.name && stripHtml(String(product.name))) || 'Producto';
    out.push({
      product_name: name.trim() || 'Producto',
      default_code: String(sku).trim(),
      add_qty: Math.max(1, quantity),
    });
  }
  return out;
}

/**
 * Compara disponibilidad FLAI con cantidades pedidas.
 * @param {Array<{ default_code: string, add_qty: number }>} requested - lo que pedimos
 * @param {Array<{ default_code: string, qtyRemain: number }>} availability - respuesta FLAI
 * @returns {Array<{ product_name?: string, default_code: string, requested: number, available: number }>} ítems con stock insuficiente
 */
export function getInsufficientStock(requested, availability) {
  const bySku = {};
  (availability || []).forEach((p) => {
    bySku[p.default_code] = Number(p.qtyRemain) || 0;
  });
  const insufficient = [];
  (requested || []).forEach((p) => {
    const available = bySku[p.default_code] ?? 0;
    if (p.add_qty > available) {
      insufficient.push({
        product_name: p.product_name,
        default_code: p.default_code,
        requested: p.add_qty,
        available,
      });
    }
  });
  return insufficient;
}
