/**
 * Tests for src/utils/cartValidation.js — validarCarrito function.
 *
 * Updated for the consultant state machine (NEW/ACTIVE/PENALIZED/DISABLED).
 *
 * IMPORTANT: For NEW and ACTIVE states, validarCarrito computes totals
 * INTERNALLY from cartItems via calcularPrecioFinal. The totalConDescuento
 * parameter is only used by the PENALIZED branch. With the default 50%
 * user discount, a product with regular_price '40000' yields precioFinal 20000.
 */

import { validarCarrito, getMinRequiredForUser, calcularTotalSeccion2, kitEnCarrito, isPremioItem, getValidationMessage } from '../cartValidation';
import {
  KIT_PRODUCT_ID,
  PREMIO_PRODUCT_ID,
  MIN_AMOUNT_NEW,
  MIN_AMOUNT_ACTIVE,
  MIN_AMOUNT_PENALIZED,
  MIN_AMOUNT_INACTIVE,
  CONSULTANT_STATES,
} from '../../constants/cartRules';

const PAST_REGISTERED = '2024-01-15T00:00:00.000Z';

function kitItem() {
  return { product: { id: KIT_PRODUCT_ID, regular_price: '500', price: '500', meta_data: [] }, quantity: 1 };
}

function makeItem(regularPrice = '1000') {
  return { product: { id: 9999, regular_price: regularPrice, price: regularPrice, meta_data: [] }, quantity: 1 };
}

// User factories
const newUser = { consultantState: 'new', registeredDate: PAST_REGISTERED };
const activeUser = { consultantState: 'active', registeredDate: PAST_REGISTERED };
const penalizedUser = { consultantState: 'penalized', registeredDate: PAST_REGISTERED };
const disabledUser = { consultantState: 'disabled', registeredDate: PAST_REGISTERED };
const blockedUser = { consultantState: 'active', restrictionState: 'blocked', registeredDate: PAST_REGISTERED };
const inactiveUser = { consultantState: 'active', restrictionState: 'inactive', registeredDate: PAST_REGISTERED };

function premioItem() {
  return { product: { id: PREMIO_PRODUCT_ID, regular_price: '500', price: '500', meta_data: [] }, quantity: 1 };
}

function netoItem(regularPrice = '2000') {
  return {
    product: {
      id: 8888,
      regular_price: regularPrice,
      price: regularPrice,
      meta_data: [{ key: '_es_precio_neto', value: 'yes' }],
    },
    quantity: 1,
  };
}

describe('validarCarrito', () => {
  it('is valid when user is null (guest)', () => {
    const result = validarCarrito([], null, 0);
    expect(result.valid).toBe(true);
  });

  it('is valid when user is administrator', () => {
    const admin = { role: 'administrator' };
    const result = validarCarrito([], admin, 0);
    expect(result.valid).toBe(true);
  });

  it('is valid when user has isAdmin=true', () => {
    const admin = { isAdmin: true };
    const result = validarCarrito([], admin, 0);
    expect(result.valid).toBe(true);
  });

  // --- DISABLED ---

  it('is invalid with type disabled for DISABLED consultant', () => {
    const result = validarCarrito([makeItem('50000')], disabledUser, 50000);
    expect(result.valid).toBe(false);
    expect(result.type).toBe('disabled');
    expect(result.minRequired).toBeNull();
  });

  // --- NEW consultant ---

  describe('NEW consultant', () => {
    it('is invalid with type missing_kit when kit is not in cart', () => {
      const result = validarCarrito([makeItem('50000')], newUser, 0);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('missing_kit');
      expect(result.minRequired).toBe(MIN_AMOUNT_NEW);
    });

    it('is invalid with type new_customer when kit is in cart but total below 20,000', () => {
      // Product regular_price 20000 => precioFinal 10000 (50% discount) < 20000
      const result = validarCarrito([kitItem(), makeItem('20000')], newUser, 0);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('new_customer');
      expect(result.gap).toBe(MIN_AMOUNT_NEW - 10000);
      expect(result.minRequired).toBe(MIN_AMOUNT_NEW);
    });

    it('is valid when kit is in cart and total is at least 20,000', () => {
      // Product regular_price 40000 => precioFinal 20000 = MIN_AMOUNT_NEW
      const result = validarCarrito([kitItem(), makeItem('40000')], newUser, 0);
      expect(result.valid).toBe(true);
    });

    it('is valid when kit is in cart and total exceeds 20,000', () => {
      // Product regular_price 60000 => precioFinal 30000 > 20000
      const result = validarCarrito([kitItem(), makeItem('60000')], newUser, 0);
      expect(result.valid).toBe(true);
    });
  });

  // --- ACTIVE consultant ---

  describe('ACTIVE consultant', () => {
    it('is invalid with type active when section 2 total below 1,000', () => {
      // Product regular_price 500 => precioFinal 250 < 1000
      const result = validarCarrito([makeItem('500')], activeUser, 0);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('active');
      expect(result.gap).toBe(MIN_AMOUNT_ACTIVE - 250);
    });

    it('is valid when section 2 total is at least 1,000', () => {
      // Product regular_price 2000 => precioFinal 1000 = MIN_AMOUNT_ACTIVE
      const result = validarCarrito([makeItem('2000')], activeUser, 0);
      expect(result.valid).toBe(true);
    });

    it('is valid when section 2 total exceeds 1,000', () => {
      // Product regular_price 4000 => precioFinal 2000 > 1000
      const result = validarCarrito([makeItem('4000')], activeUser, 0);
      expect(result.valid).toBe(true);
    });
  });

  // --- PENALIZED consultant ---

  describe('PENALIZED consultant', () => {
    it('is invalid with type penalized when total below 20,000', () => {
      const result = validarCarrito([makeItem()], penalizedUser, 10000);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('penalized');
      expect(result.gap).toBe(MIN_AMOUNT_PENALIZED - 10000);
    });

    it('is valid when total is at least 20,000', () => {
      const result = validarCarrito([makeItem()], penalizedUser, 20000);
      expect(result.valid).toBe(true);
    });

    it('is valid when total exceeds 20,000', () => {
      const result = validarCarrito([makeItem()], penalizedUser, 25000);
      expect(result.valid).toBe(true);
    });
  });

  // --- Legacy fallback ---

  it('derives NEW from legacy user (hasBoughtKit: false)', () => {
    const user = { hasBoughtKit: false, registeredDate: PAST_REGISTERED };
    const result = validarCarrito([makeItem('50000')], user, 0);
    expect(result.valid).toBe(false);
    expect(result.type).toBe('missing_kit');
  });

  it('derives ACTIVE from legacy user (hasBoughtKit: true)', () => {
    const user = { hasBoughtKit: true, registeredDate: PAST_REGISTERED };
    // Product regular_price 4000 => precioFinal 2000 > 1000
    const result = validarCarrito([makeItem('4000')], user, 0);
    expect(result.valid).toBe(true);
  });

  // --- BLOCKED consultant ---

  describe('consultora BLOCKED (restrictionState)', () => {
    it('es invalido con tipo blocked sin importar el contenido del carrito', () => {
      const result = validarCarrito([makeItem('50000')], blockedUser, 50000);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('blocked');
      expect(result.minRequired).toBeNull();
    });

    it('es invalido con tipo blocked aunque el carrito este vacio', () => {
      const result = validarCarrito([], blockedUser, 0);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('blocked');
    });

    it('es invalido con tipo blocked aunque el total sea muy alto', () => {
      const result = validarCarrito([makeItem('999999')], blockedUser, 999999);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('blocked');
    });
  });

  // --- INACTIVE consultant ---

  describe('consultora INACTIVE (restrictionState)', () => {
    it('es invalido con tipo inactive cuando seccion 2 esta por debajo de RD$20,000', () => {
      // regular_price 10000 => precioFinal 5000 (50% desc) < 20000
      const result = validarCarrito([makeItem('10000')], inactiveUser, 5000);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('inactive');
      expect(result.minRequired).toBe(MIN_AMOUNT_INACTIVE);
      expect(result.gap).toBe(MIN_AMOUNT_INACTIVE - 5000);
    });

    it('es invalido cuando el total de seccion 2 es exactamente 1 peso menos del minimo', () => {
      // Necesitamos total S2 = 19999 => regular_price que da 19999 con 50% = 39998
      const result = validarCarrito([makeItem('39998')], inactiveUser, 19999);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('inactive');
      expect(result.gap).toBe(1);
    });

    it('es valido cuando seccion 2 alcanza exactamente RD$20,000', () => {
      // regular_price 40000 => precioFinal 20000 = MIN_AMOUNT_INACTIVE
      const result = validarCarrito([makeItem('40000')], inactiveUser, 20000);
      expect(result.valid).toBe(true);
    });

    it('es valido cuando seccion 2 supera RD$20,000', () => {
      // regular_price 60000 => precioFinal 30000 > 20000
      const result = validarCarrito([makeItem('60000')], inactiveUser, 30000);
      expect(result.valid).toBe(true);
    });

    it('excluye el producto premio del calculo de seccion 2', () => {
      // Solo el premio en carrito: total S2 = 0 < 20000
      const result = validarCarrito([premioItem()], inactiveUser, 0);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('inactive');
    });

    it('excluye productos netos del calculo de seccion 2', () => {
      // Producto neto (esNeto=true) no cuenta como seccion 2
      // netoItem regular_price 40000 pero esNeto=true => no suma a S2
      const result = validarCarrito([netoItem('40000')], inactiveUser, 0);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('inactive');
    });
  });

  // --- Casos borde: exactamente en el umbral ---

  describe('casos borde en umbrales de minimo', () => {
    it('NEW: exactamente en el minimo de RD$20,000 en productos es valido', () => {
      // regular_price 40000 => precioFinal 20000 = MIN_AMOUNT_NEW
      const result = validarCarrito([kitItem(), makeItem('40000')], newUser, 0);
      expect(result.valid).toBe(true);
    });

    it('NEW: un peso por debajo del minimo es invalido', () => {
      // Necesitamos precioFinal = 19999 => regular_price = 39998 con 50% desc
      const result = validarCarrito([kitItem(), makeItem('39998')], newUser, 0);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('new_customer');
      expect(result.gap).toBe(1);
    });

    it('ACTIVE: exactamente en el minimo de RD$1,000 es valido', () => {
      // regular_price 2000 => precioFinal 1000 = MIN_AMOUNT_ACTIVE
      const result = validarCarrito([makeItem('2000')], activeUser, 0);
      expect(result.valid).toBe(true);
    });

    it('ACTIVE: un peso por debajo del minimo es invalido', () => {
      // regular_price 1998 => precioFinal 999 < 1000
      const result = validarCarrito([makeItem('1998')], activeUser, 0);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('active');
      expect(result.gap).toBe(1);
    });

    it('PENALIZED: exactamente en el minimo de RD$20,000 es valido', () => {
      const result = validarCarrito([makeItem()], penalizedUser, MIN_AMOUNT_PENALIZED);
      expect(result.valid).toBe(true);
    });

    it('PENALIZED: un peso por debajo del minimo es invalido', () => {
      const result = validarCarrito([makeItem()], penalizedUser, MIN_AMOUNT_PENALIZED - 1);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('penalized');
      expect(result.gap).toBe(1);
    });
  });
});

// ---------------------------------------------------------------------------
// kitEnCarrito
// ---------------------------------------------------------------------------

describe('kitEnCarrito', () => {
  it('retorna true cuando el kit esta en el carrito', () => {
    expect(kitEnCarrito([kitItem()])).toBe(true);
  });

  it('retorna false cuando el kit no esta en el carrito', () => {
    expect(kitEnCarrito([makeItem()])).toBe(false);
  });

  it('retorna false cuando el carrito esta vacio', () => {
    expect(kitEnCarrito([])).toBe(false);
  });

  it('retorna false cuando cartItems no es un array', () => {
    expect(kitEnCarrito(null)).toBe(false);
    expect(kitEnCarrito(undefined)).toBe(false);
  });

  it('retorna true cuando el kit esta mezclado con otros productos', () => {
    expect(kitEnCarrito([makeItem(), kitItem(), makeItem('2000')])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isPremioItem
// ---------------------------------------------------------------------------

describe('isPremioItem', () => {
  it('retorna true cuando el item es el producto premio', () => {
    expect(isPremioItem(premioItem())).toBe(true);
  });

  it('retorna false cuando el item no es el premio', () => {
    expect(isPremioItem(makeItem())).toBe(false);
    expect(isPremioItem(kitItem())).toBe(false);
  });

  it('retorna false cuando el item es null o undefined', () => {
    expect(isPremioItem(null)).toBeFalsy();
    expect(isPremioItem(undefined)).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// calcularTotalSeccion2
// ---------------------------------------------------------------------------

describe('calcularTotalSeccion2', () => {
  it('suma productos con descuento (no netos)', () => {
    // regular_price 2000 => precioFinal 1000 con 50% descuento
    const total = calcularTotalSeccion2([makeItem('2000')], activeUser);
    expect(total).toBe(1000);
  });

  it('excluye el producto premio del calculo', () => {
    const total = calcularTotalSeccion2([premioItem()], activeUser);
    expect(total).toBe(0);
  });

  it('excluye productos netos (esNeto=true)', () => {
    const total = calcularTotalSeccion2([netoItem('5000')], activeUser);
    expect(total).toBe(0);
  });

  it('mezcla productos: suma solo los con descuento', () => {
    // makeItem('4000') => precioFinal 2000, netoItem excluido, premioItem excluido
    const items = [makeItem('4000'), netoItem('10000'), premioItem()];
    const total = calcularTotalSeccion2(items, activeUser);
    expect(total).toBe(2000);
  });

  it('retorna 0 cuando el carrito esta vacio', () => {
    expect(calcularTotalSeccion2([], activeUser)).toBe(0);
  });

  it('retorna 0 cuando cartItems no es un array', () => {
    expect(calcularTotalSeccion2(null, activeUser)).toBe(0);
  });

  it('respeta la cantidad del item en el calculo', () => {
    const item = { product: { id: 9999, regular_price: '2000', price: '2000', meta_data: [] }, quantity: 3 };
    // precioFinal = 1000 x 3 = 3000
    const total = calcularTotalSeccion2([item], activeUser);
    expect(total).toBe(3000);
  });
});

// ---------------------------------------------------------------------------
// getMinRequiredForUser
// ---------------------------------------------------------------------------

describe('getMinRequiredForUser', () => {
  it('retorna null cuando el usuario es null', () => {
    expect(getMinRequiredForUser(null)).toBeNull();
  });

  it('retorna null cuando el usuario es administrador por role', () => {
    expect(getMinRequiredForUser({ role: 'administrator' })).toBeNull();
  });

  it('retorna null cuando el usuario tiene isAdmin=true', () => {
    expect(getMinRequiredForUser({ isAdmin: true })).toBeNull();
  });

  it('retorna MIN_AMOUNT_INACTIVE cuando restrictionState es INACTIVE', () => {
    const user = { restrictionState: CONSULTANT_STATES.INACTIVE, consultantState: 'active' };
    expect(getMinRequiredForUser(user)).toBe(MIN_AMOUNT_INACTIVE);
  });

  it('retorna null cuando restrictionState es BLOCKED (via getMinimumForState)', () => {
    // BLOCKED -> getConsultantState devuelve 'blocked' -> getMinimumForState devuelve null
    const user = { consultantState: CONSULTANT_STATES.BLOCKED };
    expect(getMinRequiredForUser(user)).toBeNull();
  });

  it('retorna MIN_AMOUNT_NEW para consultora NEW', () => {
    expect(getMinRequiredForUser(newUser)).toBe(MIN_AMOUNT_NEW);
  });

  it('retorna MIN_AMOUNT_ACTIVE para consultora ACTIVE', () => {
    expect(getMinRequiredForUser(activeUser)).toBe(MIN_AMOUNT_ACTIVE);
  });

  it('retorna MIN_AMOUNT_PENALIZED para consultora PENALIZED', () => {
    expect(getMinRequiredForUser(penalizedUser)).toBe(MIN_AMOUNT_PENALIZED);
  });

  it('retorna null para consultora DISABLED', () => {
    expect(getMinRequiredForUser(disabledUser)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getValidationMessage
// ---------------------------------------------------------------------------

describe('getValidationMessage', () => {
  it('retorna cadena vacia cuando result es null', () => {
    expect(getValidationMessage(null)).toBe('');
  });

  it('retorna cadena vacia cuando result.valid es true', () => {
    expect(getValidationMessage({ valid: true })).toBe('');
  });

  it('retorna mensaje de blocked para tipo blocked', () => {
    const msg = getValidationMessage({ valid: false, type: 'blocked' });
    expect(msg).toContain('inhabilitada');
  });

  it('retorna mensaje de disabled para tipo disabled', () => {
    const msg = getValidationMessage({ valid: false, type: 'disabled' });
    expect(msg).toContain('deshabilitada');
  });

  it('retorna mensaje de missing_kit para tipo missing_kit', () => {
    const msg = getValidationMessage({ valid: false, type: 'missing_kit' });
    expect(msg).toContain('Kit Inicial');
  });

  it('retorna mensaje con gap para tipo new_customer', () => {
    const msg = getValidationMessage({ valid: false, type: 'new_customer', gap: 10000 });
    expect(msg).toContain('Kit Inicial');
    expect(msg).toContain('20,000');
  });

  it('retorna mensaje con gap para tipo active', () => {
    const msg = getValidationMessage({ valid: false, type: 'active', gap: 500 });
    expect(msg).toContain('1,000');
  });

  it('retorna mensaje con gap para tipo penalized', () => {
    const msg = getValidationMessage({ valid: false, type: 'penalized', gap: 5000 });
    expect(msg).toContain('20,000');
  });

  it('retorna mensaje con gap para tipo inactive', () => {
    const msg = getValidationMessage({ valid: false, type: 'inactive', gap: 3000 });
    expect(msg).toContain('inactiva');
    expect(msg).toContain('20,000');
  });

  it('retorna mensaje generico para tipo desconocido', () => {
    const msg = getValidationMessage({ valid: false, type: 'tipo_desconocido' });
    expect(msg).toContain('requisitos minimos');
  });
});
