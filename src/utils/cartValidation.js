/**
 * Validacion del carrito: Kit Inicial y compras minimas segun estado de consultora.
 * Los minimos se evaluan usando el sistema formal de estados (consultantState.js).
 */

import {
  KIT_PRODUCT_ID,
  PREMIO_PRODUCT_ID,
  CONSULTANT_STATES,
  MIN_AMOUNT_INACTIVE,
} from '../constants/cartRules';
import { getConsultantState, getMinimumForState } from '../utils/consultantState';
import { calcularPrecioFinal } from '../utils/discounts';

/**
 * True si el Kit Inicial (producto 4994) esta en el carrito.
 * @param {Array} cartItems - [{ product, quantity }]
 * @returns {boolean}
 */
export function kitEnCarrito(cartItems) {
  if (!Array.isArray(cartItems)) return false;
  return cartItems.some((item) => item.product && item.product.id === KIT_PRODUCT_ID);
}

/**
 * True si el item es el producto premio (regalo automatico).
 * @param {Object} item - { product, quantity }
 * @returns {boolean}
 */
export function isPremioItem(item) {
  return item && item.product && item.product.id === PREMIO_PRODUCT_ID;
}

/**
 * Minimo requerido (en Pesos Dominicanos) para el usuario actual.
 * Retorna null si no aplica (no logueado, admin, o estado DISABLED).
 * @param {Object|null} user
 * @returns {number|null}
 */
export function getMinRequiredForUser(user) {
  if (!user) return null;
  if (user.role === 'administrator' || user.isAdmin) return null;
  // Restriccion INACTIVE tiene prioridad sobre el estado base
  if (user.restrictionState === CONSULTANT_STATES.INACTIVE) {
    return MIN_AMOUNT_INACTIVE;
  }
  const state = getConsultantState(user);
  return getMinimumForState(state);
}

/**
 * Calcula el total de productos "seccion 2" (productos con descuento, es decir esNeto !== true).
 * Excluye el producto PREMIO del calculo.
 * @param {Array} cartItems - [{ product, quantity }]
 * @param {Object|null} user
 * @returns {number}
 */
export function calcularTotalSeccion2(cartItems, user) {
  if (!Array.isArray(cartItems)) return 0;
  return cartItems.reduce((sum, { product, quantity }) => {
    if (!product || product.id === PREMIO_PRODUCT_ID) return sum;
    const priceInfo = calcularPrecioFinal(product, user);
    // Seccion 2 = productos con descuento (no netos)
    if (priceInfo.esNeto) return sum;
    return sum + priceInfo.precioFinal * quantity;
  }, 0);
}

/**
 * Valida el carrito segun el estado formal de la consultora.
 * Excluye el producto PREMIO de todos los calculos de minimos.
 * @param {Array} cartItems - [{ product, quantity }]
 * @param {Object|null} user - Usuario del AuthContext
 * @param {number} totalConDescuento - Total a pagar (con descuentos aplicados)
 * @param {number} [premioTotal=0] - Total del premio a excluir de minimos
 * @returns {{ valid: boolean, type?: string, gap?: number, minRequired?: number }}
 */
export function validarCarrito(cartItems, user, totalConDescuento, premioTotal = 0) {
  if (!user) return { valid: true };
  if (user.role === 'administrator' || user.isAdmin) return { valid: true };

  // BLOCKED: cuenta bloqueada por admin — maxima prioridad
  if (user.restrictionState === CONSULTANT_STATES.BLOCKED) {
    return { valid: false, type: 'blocked', minRequired: null };
  }

  // INACTIVE: minimo RD$20,000 solo en productos con descuento (seccion 2) para reactivar
  if (user.restrictionState === CONSULTANT_STATES.INACTIVE) {
    const totalS2 = calcularTotalSeccion2(cartItems, user);
    if (totalS2 < MIN_AMOUNT_INACTIVE) {
      return { valid: false, gap: MIN_AMOUNT_INACTIVE - totalS2, type: 'inactive', minRequired: MIN_AMOUNT_INACTIVE };
    }
    return { valid: true };
  }

  const state = getConsultantState(user);
  const minimum = getMinimumForState(state);

  // DISABLED: no puede comprar
  if (state === CONSULTANT_STATES.DISABLED) {
    return { valid: false, type: 'disabled', minRequired: null };
  }

  // NEW: requiere kit + total (sin kit y sin premio) >= 20,000
  if (state === CONSULTANT_STATES.NEW) {
    if (!kitEnCarrito(cartItems)) {
      return { valid: false, type: 'missing_kit', minRequired: minimum };
    }
    // Total excluyendo kit y premio
    const totalSinKitPremio = cartItems.reduce((sum, { product, quantity }) => {
      if (!product || product.id === KIT_PRODUCT_ID || product.id === PREMIO_PRODUCT_ID) return sum;
      const info = calcularPrecioFinal(product, user);
      return sum + info.precioFinal * quantity;
    }, 0);
    if (totalSinKitPremio < minimum) {
      return { valid: false, gap: minimum - totalSinKitPremio, type: 'new_customer', minRequired: minimum };
    }
    return { valid: true };
  }

  // ACTIVE: minimo 1,000 en productos seccion 2 (con descuento, no netos)
  if (state === CONSULTANT_STATES.ACTIVE) {
    const totalS2 = calcularTotalSeccion2(cartItems, user);
    if (totalS2 < minimum) {
      return { valid: false, gap: minimum - totalS2, type: 'active', minRequired: minimum };
    }
    return { valid: true };
  }

  // PENALIZED: minimo 20,000 (sin envio, sin premio)
  if (state === CONSULTANT_STATES.PENALIZED) {
    const total = (typeof totalConDescuento === 'number' ? totalConDescuento : 0) - (premioTotal || 0);
    if (total < minimum) {
      return { valid: false, gap: minimum - total, type: 'penalized', minRequired: minimum };
    }
    return { valid: true };
  }

  return { valid: true };
}

/**
 * Mensaje de error en espanol segun el resultado de validarCarrito.
 * @param {Object} result - { valid, type, gap, minRequired }
 * @returns {string}
 */
export function getValidationMessage(result) {
  if (!result || result.valid) return '';
  const gap = result.gap != null ? Math.ceil(result.gap) : 0;
  const gapStr = gap.toLocaleString('es-DO');
  switch (result.type) {
    case 'blocked':
      return 'Tu cuenta esta bloqueada. Contacta a soporte tecnico.';
    case 'disabled':
      return 'Tu cuenta esta deshabilitada. Contacta a soporte para mas informacion.';
    case 'missing_kit':
      return 'Requisito: El Kit Inicial es obligatorio para tu primera compra.';
    case 'new_customer':
      return `Tu primera compra requiere el Kit Inicial + RD$ 20,000 en productos. Faltan RD$ ${gapStr}.`;
    case 'active':
      return `Pedido minimo RD$ 1,000 en productos con descuento. Faltan RD$ ${gapStr}.`;
    case 'penalized':
      return `Para reactivar tu cuenta, pedido minimo RD$ 20,000. Faltan RD$ ${gapStr}.`;
    case 'inactive':
      return `Tu cuenta esta inactiva. Para reactivarla necesitas una compra minima de RD$20,000. Faltan RD$ ${gapStr}.`;
    default:
      return 'Tu carrito no cumple con los requisitos minimos.';
  }
}
