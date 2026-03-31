/**
 * Tests for src/utils/cartValidation.js
 *
 * Updated for the consultant state machine (NEW/ACTIVE/PENALIZED/DISABLED).
 * All user factories use registeredDate in the past to avoid
 * the "Mes de Bienvenida" discount rule in discounts.js.
 *
 * IMPORTANT: For NEW and ACTIVE states, validarCarrito computes totals
 * INTERNALLY from cartItems via calcularPrecioFinal. The totalConDescuento
 * parameter is only used by the PENALIZED branch. With the default 50%
 * user discount, a product with regular_price '40000' yields precioFinal 20000.
 */

import {
  validarCarrito,
  getMinRequiredForUser,
  kitEnCarrito,
  getValidationMessage,
  isPremioItem,
  calcularTotalSeccion2,
} from '../src/utils/cartValidation';
import {
  KIT_PRODUCT_ID,
  PREMIO_PRODUCT_ID,
  MIN_AMOUNT_NEW,
  MIN_AMOUNT_ACTIVE,
  MIN_AMOUNT_PENALIZED,
  CONSULTANT_STATES,
} from '../src/constants/cartRules';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAST_REGISTERED = '2024-01-15T00:00:00.000Z';

/** Creates a cart item with proper fields for calcularPrecioFinal. */
const makeItem = (id, quantity = 1, regularPrice = '1000') => ({
  product: { id, regular_price: regularPrice, price: regularPrice, meta_data: [] },
  quantity,
});

/** Creates a precio neto cart item (0% discount). */
const makeNetoItem = (id, quantity = 1, regularPrice = '1000') => ({
  product: {
    id,
    regular_price: regularPrice,
    price: regularPrice,
    meta_data: [{ key: '_es_precio_neto', value: 'yes' }],
  },
  quantity,
});

const kitItem = makeItem(KIT_PRODUCT_ID, 1, '500');
const premioItem = makeItem(PREMIO_PRODUCT_ID, 1, '5000');

// User factories by consultant state
const newUser = () => ({ consultantState: 'new', registeredDate: PAST_REGISTERED });
const activeUser = () => ({ consultantState: 'active', registeredDate: PAST_REGISTERED });
const penalizedUser = () => ({ consultantState: 'penalized', registeredDate: PAST_REGISTERED });
const disabledUser = () => ({ consultantState: 'disabled', registeredDate: PAST_REGISTERED });

// ---------------------------------------------------------------------------
// kitEnCarrito
// ---------------------------------------------------------------------------

describe('kitEnCarrito', () => {
  it('returns false for empty array', () => {
    expect(kitEnCarrito([])).toBe(false);
  });

  it('returns false for non-array input', () => {
    expect(kitEnCarrito(null)).toBe(false);
    expect(kitEnCarrito(undefined)).toBe(false);
  });

  it('returns true when kit is in cart', () => {
    expect(kitEnCarrito([kitItem])).toBe(true);
  });

  it('returns false when only other products are in cart', () => {
    expect(kitEnCarrito([makeItem(123), makeItem(456)])).toBe(false);
  });

  it('returns true when kit is among multiple products', () => {
    expect(kitEnCarrito([makeItem(100), kitItem, makeItem(200)])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isPremioItem
// ---------------------------------------------------------------------------

describe('isPremioItem', () => {
  it('returns true for premio product', () => {
    expect(isPremioItem(makeItem(PREMIO_PRODUCT_ID))).toBe(true);
  });

  it('returns false for kit product', () => {
    expect(isPremioItem(kitItem)).toBe(false);
  });

  it('returns false for null item', () => {
    expect(isPremioItem(null)).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// getMinRequiredForUser
// ---------------------------------------------------------------------------

describe('getMinRequiredForUser', () => {
  it('returns null for null user', () => {
    expect(getMinRequiredForUser(null)).toBeNull();
  });

  it('returns null for administrator', () => {
    expect(getMinRequiredForUser({ role: 'administrator' })).toBeNull();
  });

  it('returns null when isAdmin is true', () => {
    expect(getMinRequiredForUser({ isAdmin: true })).toBeNull();
  });

  it('returns MIN_AMOUNT_NEW for NEW consultant', () => {
    expect(getMinRequiredForUser(newUser())).toBe(MIN_AMOUNT_NEW);
    expect(getMinRequiredForUser(newUser())).toBe(20000);
  });

  it('returns MIN_AMOUNT_ACTIVE for ACTIVE consultant', () => {
    expect(getMinRequiredForUser(activeUser())).toBe(MIN_AMOUNT_ACTIVE);
    expect(getMinRequiredForUser(activeUser())).toBe(1000);
  });

  it('returns MIN_AMOUNT_PENALIZED for PENALIZED consultant', () => {
    expect(getMinRequiredForUser(penalizedUser())).toBe(MIN_AMOUNT_PENALIZED);
    expect(getMinRequiredForUser(penalizedUser())).toBe(20000);
  });

  it('returns null for DISABLED consultant', () => {
    expect(getMinRequiredForUser(disabledUser())).toBeNull();
  });

  it('derives NEW from legacy user without hasBoughtKit', () => {
    expect(getMinRequiredForUser({ hasBoughtKit: false })).toBe(MIN_AMOUNT_NEW);
  });

  it('derives ACTIVE from legacy user with hasBoughtKit', () => {
    expect(getMinRequiredForUser({ hasBoughtKit: true })).toBe(MIN_AMOUNT_ACTIVE);
  });
});

// ---------------------------------------------------------------------------
// calcularTotalSeccion2
// ---------------------------------------------------------------------------

describe('calcularTotalSeccion2', () => {
  it('returns 0 for empty cart', () => {
    expect(calcularTotalSeccion2([], activeUser())).toBe(0);
  });

  it('sums discounted prices of non-neto products', () => {
    // regular_price 2000, 50% discount => precioFinal 1000, qty 1
    const total = calcularTotalSeccion2([makeItem(100, 1, '2000')], activeUser());
    expect(total).toBe(1000);
  });

  it('excludes neto products', () => {
    const items = [
      makeItem(100, 1, '2000'),     // 50% => 1000
      makeNetoItem(200, 1, '3000'), // neto => excluded
    ];
    const total = calcularTotalSeccion2(items, activeUser());
    expect(total).toBe(1000);
  });

  it('excludes premio product', () => {
    const items = [
      makeItem(100, 1, '2000'), // 50% => 1000
      premioItem,               // excluded (PREMIO_PRODUCT_ID)
    ];
    const total = calcularTotalSeccion2(items, activeUser());
    expect(total).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// validarCarrito
// ---------------------------------------------------------------------------

describe('validarCarrito', () => {
  // --- Null / Admin bypass ---

  it('returns valid when user is null', () => {
    expect(validarCarrito([], null, 0).valid).toBe(true);
  });

  it('returns valid for administrator regardless of cart contents', () => {
    expect(validarCarrito([], { role: 'administrator' }, 0).valid).toBe(true);
  });

  it('returns valid for isAdmin user', () => {
    expect(validarCarrito([], { isAdmin: true }, 0).valid).toBe(true);
  });

  // --- DISABLED ---

  it('returns disabled for DISABLED consultant', () => {
    const result = validarCarrito([makeItem(123)], disabledUser(), 50000);
    expect(result.valid).toBe(false);
    expect(result.type).toBe('disabled');
    expect(result.minRequired).toBeNull();
  });

  // --- NEW consultant ---

  it('fails with missing_kit for NEW user without kit in cart', () => {
    // Product with regular_price 50000 => precioFinal 25000, enough money but no kit
    const result = validarCarrito([makeItem(123, 1, '50000')], newUser(), 0);
    expect(result.valid).toBe(false);
    expect(result.type).toBe('missing_kit');
  });

  it('fails with new_customer for NEW user with kit but below MIN_AMOUNT_NEW', () => {
    // Kit (excluded from total) + product regular_price 20000 => precioFinal 10000 < 20000
    const result = validarCarrito([kitItem, makeItem(123, 1, '20000')], newUser(), 0);
    expect(result.valid).toBe(false);
    expect(result.type).toBe('new_customer');
    expect(result.gap).toBe(MIN_AMOUNT_NEW - 10000); // 10000
  });

  it('passes for NEW user with kit and total exactly MIN_AMOUNT_NEW', () => {
    // Kit (excluded) + product regular_price 40000 => precioFinal 20000 = MIN_AMOUNT_NEW
    const result = validarCarrito([kitItem, makeItem(123, 1, '40000')], newUser(), 0);
    expect(result.valid).toBe(true);
  });

  it('passes for NEW user with kit and total above MIN_AMOUNT_NEW', () => {
    // Kit (excluded) + product regular_price 60000 => precioFinal 30000 > 20000
    const result = validarCarrito([kitItem, makeItem(123, 1, '60000')], newUser(), 0);
    expect(result.valid).toBe(true);
  });

  it('excludes premio from NEW total calculation', () => {
    // Kit (excluded) + premio (excluded) + product regular_price 20000 => precioFinal 10000 < 20000
    const items = [kitItem, premioItem, makeItem(123, 1, '20000')];
    const result = validarCarrito(items, newUser(), 0);
    expect(result.valid).toBe(false);
    expect(result.type).toBe('new_customer');
  });

  // --- ACTIVE consultant ---

  it('fails with active for ACTIVE user below MIN_AMOUNT_ACTIVE', () => {
    // Product regular_price 500 => precioFinal 250 < 1000 (section 2 total)
    const result = validarCarrito([makeItem(123, 1, '500')], activeUser(), 0);
    expect(result.valid).toBe(false);
    expect(result.type).toBe('active');
    expect(result.gap).toBe(MIN_AMOUNT_ACTIVE - 250); // 750
  });

  it('passes for ACTIVE user at exactly MIN_AMOUNT_ACTIVE', () => {
    // Product regular_price 2000 => precioFinal 1000 = MIN_AMOUNT_ACTIVE
    const result = validarCarrito([makeItem(123, 1, '2000')], activeUser(), 0);
    expect(result.valid).toBe(true);
  });

  it('passes for ACTIVE user above MIN_AMOUNT_ACTIVE', () => {
    // Product regular_price 4000 => precioFinal 2000 > 1000
    const result = validarCarrito([makeItem(123, 1, '4000')], activeUser(), 0);
    expect(result.valid).toBe(true);
  });

  it('excludes neto products from ACTIVE section 2 total', () => {
    // Only neto product => section 2 total = 0 < 1000
    const result = validarCarrito([makeNetoItem(123, 1, '5000')], activeUser(), 0);
    expect(result.valid).toBe(false);
    expect(result.type).toBe('active');
  });

  // --- PENALIZED consultant ---

  it('fails with penalized for PENALIZED user below MIN_AMOUNT_PENALIZED', () => {
    // PENALIZED uses totalConDescuento parameter: 15000 - 0 = 15000 < 20000
    const result = validarCarrito([makeItem(123)], penalizedUser(), 15000);
    expect(result.valid).toBe(false);
    expect(result.type).toBe('penalized');
    expect(result.gap).toBe(MIN_AMOUNT_PENALIZED - 15000); // 5000
  });

  it('passes for PENALIZED user at exactly MIN_AMOUNT_PENALIZED', () => {
    const result = validarCarrito([makeItem(123)], penalizedUser(), MIN_AMOUNT_PENALIZED);
    expect(result.valid).toBe(true);
  });

  it('passes for PENALIZED user above MIN_AMOUNT_PENALIZED', () => {
    const result = validarCarrito([makeItem(123)], penalizedUser(), 25000);
    expect(result.valid).toBe(true);
  });

  it('excludes premioTotal from PENALIZED total', () => {
    // totalConDescuento 25000 - premioTotal 10000 = 15000 < 20000
    const result = validarCarrito([makeItem(123)], penalizedUser(), 25000, 10000);
    expect(result.valid).toBe(false);
    expect(result.type).toBe('penalized');
    expect(result.gap).toBe(MIN_AMOUNT_PENALIZED - 15000); // 5000
  });

  // --- Legacy fallback ---

  it('derives NEW state from legacy user (hasBoughtKit: false)', () => {
    const user = { hasBoughtKit: false, registeredDate: PAST_REGISTERED };
    const result = validarCarrito([makeItem(123, 1, '50000')], user, 0);
    expect(result.valid).toBe(false);
    expect(result.type).toBe('missing_kit'); // NEW requires kit
  });

  it('derives ACTIVE state from legacy user (hasBoughtKit: true)', () => {
    const user = { hasBoughtKit: true, registeredDate: PAST_REGISTERED };
    // Product regular_price 4000 => precioFinal 2000 > 1000
    const result = validarCarrito([makeItem(123, 1, '4000')], user, 0);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getValidationMessage
// ---------------------------------------------------------------------------

describe('getValidationMessage', () => {
  it('returns empty string for valid result', () => {
    expect(getValidationMessage({ valid: true })).toBe('');
  });

  it('returns empty string for null result', () => {
    expect(getValidationMessage(null)).toBe('');
  });

  it('returns message containing Kit Inicial for missing_kit', () => {
    const msg = getValidationMessage({ valid: false, type: 'missing_kit' });
    expect(msg).toContain('Kit Inicial');
  });

  it('returns message containing 20,000 for new_customer', () => {
    const msg = getValidationMessage({ valid: false, type: 'new_customer', gap: 5000 });
    expect(msg).toContain('20,000');
    expect(msg).toContain('5,000');
  });

  it('returns message containing 1,000 for active', () => {
    const msg = getValidationMessage({ valid: false, type: 'active', gap: 500 });
    expect(msg).toContain('1,000');
    expect(msg).toContain('500');
  });

  it('returns message containing 20,000 for penalized', () => {
    const msg = getValidationMessage({ valid: false, type: 'penalized', gap: 5000 });
    expect(msg).toContain('20,000');
    expect(msg).toContain('5,000');
  });

  it('returns message for disabled account', () => {
    const msg = getValidationMessage({ valid: false, type: 'disabled' });
    expect(msg).toContain('deshabilitada');
  });

  it('returns fallback message for unknown type', () => {
    const msg = getValidationMessage({ valid: false, type: 'unknown_type' });
    expect(msg.length).toBeGreaterThan(0);
  });
});
