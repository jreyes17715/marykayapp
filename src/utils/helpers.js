/**
 * Funciones helper (formateo de precio, etc.)
 * Precios en Pesos Dominicanos (RD$).
 */

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

/**
 * Obtiene el precio efectivo de un producto WooCommerce (sale_price > price > regular_price).
 */
export function getProductPrice(product) {
  if (!product) return 0;
  const raw = product.sale_price || product.price || product.regular_price || '0';
  const num = typeof raw === 'string' ? parseFloat(raw) : raw;
  return isNaN(num) ? 0 : num;
}

/**
 * Strips HTML tags from a string, collapsing whitespace.
 * @param {string} html
 * @returns {string}
 */
export function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
