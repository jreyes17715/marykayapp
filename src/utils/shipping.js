/**
 * Calculo de envio por provincia para Republica Dominicana.
 * Tarifa plana segun destino; envio gratis sobre FREE_SHIPPING_THRESHOLD.
 */
import { PREMIO_THRESHOLD } from '../constants/cartRules';

export const FREE_SHIPPING_THRESHOLD = PREMIO_THRESHOLD; // RD$ 60,000

export const SHIPPING_RATES = {
  'Santo Domingo': 350,
  'Distrito Nacional': 350,
  'Santiago': 450,
};

const DEFAULT_RATE = 550;

/**
 * Calcula el costo de envio dado la provincia y el total del carrito.
 *
 * @param {string|null} province - Nombre de la provincia (de PROVINCIAS_RD)
 * @param {number} cartTotal - Total del carrito con descuentos aplicados
 * @param {boolean} [hasFreeShipping=false] - true si el usuario tiene envio gratis por promocion
 * @returns {{ cost: number, isFree: boolean, label: string }}
 */
export function calculateShipping(province, cartTotal, hasFreeShipping = false) {
  if (hasFreeShipping) {
    return { cost: 0, isFree: true, label: 'Gratis (promocion)' };
  }

  const total = typeof cartTotal === 'number' ? cartTotal : 0;

  if (total >= FREE_SHIPPING_THRESHOLD) {
    return { cost: 0, isFree: true, label: 'Gratis' };
  }

  if (!province || typeof province !== 'string' || !province.trim()) {
    // Provincia no seleccionada: mostrar placeholder
    return { cost: 0, isFree: false, label: 'Por calcular' };
  }

  const trimmed = province.trim();
  const rate =
    Object.prototype.hasOwnProperty.call(SHIPPING_RATES, trimmed)
      ? SHIPPING_RATES[trimmed]
      : DEFAULT_RATE;

  return {
    cost: rate,
    isFree: false,
    label: `RD$ ${rate.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`,
  };
}
