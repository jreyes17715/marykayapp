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
 * Extrae el valor de un meta del array meta_data de un customer de WooCommerce.
 * meta_data: [{ id, key, value }, ...]
 * @param {Array} metaArray - meta_data del customer
 * @param {string} key - nombre del meta (ej: 'has_bought_kit', '_nivelpro_override_porcentaje')
 * @returns {*} valor del meta o undefined si no existe
 */
export function getUserMeta(metaArray, key) {
  if (!Array.isArray(metaArray) || !key) return undefined;
  const item = metaArray.find((m) => m && m.key === key);
  return item === undefined ? undefined : item.value;
}
