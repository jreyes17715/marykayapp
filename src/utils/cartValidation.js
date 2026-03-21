/**
 * Validación del carrito: Kit Inicial y compras mínimas.
 * Los mínimos se evalúan sobre totalConDescuento (total con descuentos aplicados).
 */

import {
  KIT_PRODUCT_ID,
  PREMIO_PRODUCT_ID,
  MIN_AMOUNT_NEW,
  MIN_AMOUNT_RETURNING,
  MIN_AMOUNT_REACTIVATION,
  INACTIVITY_DAYS,
} from '../constants/cartRules';

/**
 * Días desde la última compra (según lastPurchaseDate timestamp UNIX).
 * @param {Object} user
 * @returns {number} días o Infinity si no hay fecha
 */
export function diasDesdeUltimaCompra(user) {
  if (!user || user.lastPurchaseDate == null || user.lastPurchaseDate === '') return Infinity;
  let ts = user.lastPurchaseDate;
  if (typeof ts === 'string') ts = parseInt(ts, 10);
  if (isNaN(ts)) return Infinity;
  if (ts > 1e12) ts = Math.floor(ts / 1000);
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;
  return Math.max(0, diff / (24 * 60 * 60));
}

/**
 * True si el usuario está en periodo de reactivación (+90 días sin comprar).
 */
export function necesitaReactivacion(user) {
  if (!user || !user.hasBoughtKit) return false;
  const dias = diasDesdeUltimaCompra(user);
  return dias > INACTIVITY_DAYS;
}

/**
 * True si el Kit Inicial (producto 4994) está en el carrito.
 */
export function kitEnCarrito(cartItems) {
  if (!Array.isArray(cartItems)) return false;
  return cartItems.some((item) => item.product && item.product.id === KIT_PRODUCT_ID);
}

/**
 * Mínimo requerido (en Pesos Dominicanos) para el usuario actual. null si no aplica (no logueado / admin).
 */
export function getMinRequiredForUser(user) {
  if (!user) return null;
  if (user.role === 'administrator' || user.isAdmin) return null;
  if (!user.hasBoughtKit) return MIN_AMOUNT_NEW;
  if (necesitaReactivacion(user)) return MIN_AMOUNT_REACTIVATION;
  return MIN_AMOUNT_RETURNING;
}

/**
 * Mensaje de error según el resultado de validarCarrito.
 * @param {Object} result - { valid, type, gap, minRequired }
 * @returns {string}
 */
export function getValidationMessage(result) {
  if (!result || result.valid) return '';
  const gap = result.gap != null ? Math.ceil(result.gap) : 0;
  const gapStr = gap.toLocaleString('es-DO');
  switch (result.type) {
    case 'reactivation':
      return `¡Bienvenida de vuelta! 🌸 Para reactivar tu cuenta después de 90 días de inactividad, tu pedido debe ser mínimo RD$ 20,000. Faltan RD$ ${gapStr}.`;
    case 'returning':
      return `Faltan RD$ ${gapStr} para el pedido mínimo de RD$ 10,000.`;
    case 'missing_kit':
      return 'Requisito: El Kit Inicial es obligatorio para tu primera compra.';
    case 'new_customer':
      return `Faltan RD$ ${gapStr} para el pedido mínimo de RD$ 25,000 (incluye Kit Inicial + productos).`;
    default:
      return 'Tu carrito no cumple con los requisitos mínimos.';
  }
}

/**
 * True si el item es el producto premio (regalo automático).
 */
export function isPremioItem(item) {
  return item && item.product && item.product.id === PREMIO_PRODUCT_ID;
}

/**
 * Valida el carrito según Kit Inicial y mínimos.
 * Excluye el producto PREMIO del cálculo de mínimos.
 * @param {Array} cartItems - [{ product, quantity }]
 * @param {Object|null} user - Usuario del AuthContext
 * @param {number} totalConDescuento - Total a pagar (con descuentos)
 * @param {number} [premioTotal=0] - Total del premio a excluir de mínimos
 * @returns {{ valid: boolean, type?: string, gap?: number, minRequired?: number }}
 */
export function validarCarrito(cartItems, user, totalConDescuento, premioTotal = 0) {
  const total = typeof totalConDescuento === 'number' ? totalConDescuento - premioTotal : 0;

  if (!user) return { valid: true };
  if (user.role === 'administrator' || user.isAdmin) return { valid: true };

  const hasKit = user.hasBoughtKit === true;
  const lastPurchase = user.lastPurchaseDate;
  const diasInactivo = diasDesdeUltimaCompra(user);
  const reactivation = hasKit && lastPurchase != null && diasInactivo > INACTIVITY_DAYS;
  const kitInCart = kitEnCarrito(cartItems);

  if (hasKit) {
    if (reactivation) {
      if (total < MIN_AMOUNT_REACTIVATION) {
        return {
          valid: false,
          gap: MIN_AMOUNT_REACTIVATION - total,
          type: 'reactivation',
          minRequired: MIN_AMOUNT_REACTIVATION,
        };
      }
      return { valid: true };
    }
    if (total < MIN_AMOUNT_RETURNING) {
      return {
        valid: false,
        gap: MIN_AMOUNT_RETURNING - total,
        type: 'returning',
        minRequired: MIN_AMOUNT_RETURNING,
      };
    }
    return { valid: true };
  }

  if (!kitInCart) {
    return {
      valid: false,
      type: 'missing_kit',
      minRequired: MIN_AMOUNT_NEW,
    };
  }

  if (total < MIN_AMOUNT_NEW) {
    return {
      valid: false,
      gap: MIN_AMOUNT_NEW - total,
      type: 'new_customer',
      minRequired: MIN_AMOUNT_NEW,
    };
  }

  return { valid: true };
}
