import axios from 'axios';
import config from '../constants/config';

const TIMEOUT_MS = 15000;

function base64Encode(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  for (let i = 0; i < str.length; i += 3) {
    const a = str.charCodeAt(i);
    const b = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
    const c = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;
    const n = (a << 16) | (b << 8) | c;
    output += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + chars[(n >> 6) & 63] + chars[n & 63];
  }
  const pad = str.length % 3;
  return output.slice(0, pad ? output.length - (3 - pad) : output.length);
}

const auth = base64Encode(`${config.CONSUMER_KEY}:${config.CONSUMER_SECRET}`);

const woocommerce = axios.create({
  baseURL: config.BASE_URL,
  timeout: TIMEOUT_MS,
  headers: {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
  },
});

// Cliente para WordPress REST API (JWT y wp/v2) — sin Basic Auth
const wpRest = axios.create({
  baseURL: config.WP_REST_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

function getErrorMessage(err) {
  if (!err.response) {
    if (err.code === 'ECONNABORTED') return 'Tiempo de espera agotado. Intenta de nuevo.';
    if (err.message && err.message.toLowerCase().includes('network')) return 'Error de red. Revisa tu conexión.';
    return 'No se pudo conectar con el servidor.';
  }
  const status = err.response.status;
  const data = err.response.data;
  if (status === 401) return 'No autorizado. Revisa las credenciales.';
  if (status === 404) return 'Recurso no encontrado.';
  if (status >= 500) return 'Error del servidor. Intenta más tarde.';
  if (data && data.message) return typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
  return `Error ${status}. Intenta de nuevo.`;
}

woocommerce.interceptors.response.use(
  (response) => response,
  (error) => {
    error.apiMessage = getErrorMessage(error);
    return Promise.reject(error);
  }
);

async function request(fn) {
  try {
    const response = await fn();
    return { success: true, data: response.data };
  } catch (err) {
    return {
      success: false,
      error: err.apiMessage || getErrorMessage(err),
    };
  }
}

// ——— Productos ———

export function getProducts(page = 1, perPage = 20) {
  return request(() =>
    woocommerce.get('/products', {
      params: { page, per_page: perPage, status: 'publish' },
    })
  );
}

export function getProductById(productId) {
  return request(() => woocommerce.get(`/products/${productId}`));
}

export function getProductsByCategory(categoryId, page = 1, perPage = 20) {
  return request(() =>
    woocommerce.get('/products', {
      params: { category: categoryId, page, per_page: perPage, status: 'publish' },
    })
  );
}

export function searchProducts(query) {
  return request(() =>
    woocommerce.get('/products', {
      params: { search: query, status: 'publish' },
    })
  );
}

// ——— Categorías ———

export function getCategories() {
  return request(() =>
    woocommerce.get('/products/categories', {
      params: { per_page: 100, hide_empty: true },
    })
  );
}

// ——— Órdenes ———

/**
 * orderData: {
 *   customer_id: number (0 para guest),
 *   payment_method: "bacs",
 *   payment_method_title: "Transferencia bancaria",
 *   set_paid: false,
 *   billing: { first_name, last_name, address_1, city, state, country, email, phone },
 *   shipping: { first_name, last_name, address_1, city, state, country },
 *   line_items: [{ product_id: number, quantity: number }]
 * }
 */
export function createOrder(orderData) {
  return request(() => woocommerce.post('/orders', orderData));
}

/**
 * Obtiene las órdenes de un cliente por ID.
 * WooCommerce acepta el parámetro "customer" (integer > 0).
 * customer=0 en la API de WC NO filtra por invitado — devuelve TODAS las
 * órdenes de la tienda. Por eso se bloquea cualquier id <= 0.
 */
export async function getOrdersByCustomer(customerId, page = 1) {
  const id = typeof customerId === 'number' ? customerId : parseInt(customerId, 10);
  // FIX: order-leak-customer-0 — WC REST API with customer=0 returns ALL store
  // orders (no filter), not guest orders. Block 0 and below to prevent leaking
  // other customers' data to the authenticated user.
  // Was: id < 0 (allowed 0 through) → Now: id <= 0 (blocks 0 too)
  if (Number.isNaN(id) || id <= 0) {
    return { success: true, data: [] };
  }
  try {
    const res = await woocommerce.get('/orders', {
      params: {
        customer: id,
        per_page: 20,
        page,
        orderby: 'date',
        order: 'desc',
      },
    });
    // La API devuelve un array; por si acaso viene envuelto en objeto
    let list = res.data;
    if (Array.isArray(list)) {
      // ok
    } else if (list && typeof list === 'object' && Array.isArray(list.orders)) {
      list = list.orders;
    } else if (list && typeof list === 'object' && Array.isArray(list.data)) {
      list = list.data;
    } else {
      list = [];
    }
    if (__DEV__) {
      console.log('[WC ORDERS] customer=' + id, 'count=', list.length);
    }
    return { success: true, data: list };
  } catch (error) {
    console.log('[WC ORDERS ERROR]', error.response?.status, error.response?.data || error.message);
    return {
      success: false,
      error: error.apiMessage || getErrorMessage(error),
    };
  }
}

export function updateOrder(orderId, data) {
  return request(() => woocommerce.put(`/orders/${orderId}`, data));
}

export function getOrderById(orderId) {
  return request(() => woocommerce.get(`/orders/${orderId}`));
}

export function getOrderNotes(orderId) {
  return request(() => woocommerce.get(`/orders/${orderId}/notes`));
}

// ——— Autenticación JWT (WordPress) ———

function stripHtmlFromMessage(html) {
  if (!html) return '';
  const s = typeof html !== 'string' ? String(html) : html;
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Login con usuario y contraseña. POST a jwt-auth/v1/token (endpoint público, sin Basic Auth).
 * @returns {Promise<{ success: boolean, data?: { token, user_email, user_nicename, user_display_name }, error?: string }>}
 */
export function loginUser(username, password) {
  return (async () => {
    try {
      const { data } = await wpRest.post('/jwt-auth/v1/token', {
        username: username.trim(),
        password,
      });
      return { success: true, data };
    } catch (err) {
      const status = err.response?.status;
      const rawMsg = err.response?.data?.message;
      if (status === 403 && rawMsg) {
        const msg = stripHtmlFromMessage(rawMsg) || 'Credenciales incorrectas';
        return { success: false, error: msg };
      }
      return { success: false, error: getErrorMessage(err) };
    }
  })();
}

/**
 * Valida el token JWT. POST a jwt-auth/v1/token/validate con header Authorization: Bearer {token}.
 */
export function validateToken(token) {
  return (async () => {
    try {
      await wpRest.post('/jwt-auth/v1/token/validate', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  })();
}

/**
 * Obtiene el usuario actual de WordPress. GET wp/v2/users/me con Bearer token.
 */
export function getCurrentWPUser(token) {
  return (async () => {
    try {
      const { data } = await wpRest.get('/wp/v2/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { success: true, data };
    } catch (err) {
      return { success: false, error: getErrorMessage(err), data: null };
    }
  })();
}

/**
 * Busca el customer de WooCommerce por email (varios intentos).
 * Si no se encuentra, retorna success: true con data: null para que el login use datos JWT.
 */
export async function findCustomerByEmail(email) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) return { success: true, data: null };

  try {
    const res1 = await woocommerce.get('/customers', {
      params: { email: normalizedEmail, role: 'all' },
    });
    if (res1.data && Array.isArray(res1.data) && res1.data.length > 0) {
      return { success: true, data: res1.data[0] };
    }
  } catch (e) {
    // seguir
  }

  try {
    const res2 = await woocommerce.get('/customers', {
      params: { email: normalizedEmail },
    });
    if (res2.data && Array.isArray(res2.data) && res2.data.length > 0) {
      return { success: true, data: res2.data[0] };
    }
  } catch (e) {
    // seguir
  }

  try {
    const res3 = await woocommerce.get('/customers', {
      params: { per_page: 100, role: 'all' },
    });
    if (res3.data && Array.isArray(res3.data)) {
      const found = res3.data.find(
        (c) => c.email && String(c.email).toLowerCase() === normalizedEmail
      );
      if (found) return { success: true, data: found };
    }
  } catch (e) {
    // seguir
  }

  return { success: true, data: null };
}

/** @deprecated Usar findCustomerByEmail para permitir login sin customer en WC */
export function getCustomerByEmail(email) {
  return request(() =>
    woocommerce.get('/customers', { params: { email: (email || '').trim() } })
  );
}

// ——— Clientes ———

export function getCustomer(customerId) {
  return request(() => woocommerce.get(`/customers/${customerId}`));
}

export function getCustomers() {
  return request(() =>
    woocommerce.get('/customers', { params: { role: 'all', per_page: 100 } })
  );
}

export function updateCustomer(customerId, data) {
  return request(() => woocommerce.put(`/customers/${customerId}`, data));
}

export function createCustomer(customerData) {
  return request(() => woocommerce.post('/customers', customerData));
}

// ——— Helpers ———

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/300x300?text=Sin+imagen';

export function getProductImage(product) {
  if (!product || !product.images || !product.images.length) return PLACEHOLDER_IMAGE;
  const first = product.images[0];
  return first && first.src ? first.src : PLACEHOLDER_IMAGE;
}

export function formatPrice(price) {
  if (price === undefined || price === null || price === '') return 'RD$ 0.00';
  const raw = typeof price === 'string' ? price : String(price);
  const num = parseFloat(raw);
  if (isNaN(num)) return 'RD$ 0.00';
  const formatted = num
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `RD$ ${formatted}`;
}

export function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default woocommerce;
