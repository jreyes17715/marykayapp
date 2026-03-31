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

import { validarCarrito } from '../cartValidation';
import {
  KIT_PRODUCT_ID,
  MIN_AMOUNT_NEW,
  MIN_AMOUNT_ACTIVE,
  MIN_AMOUNT_PENALIZED,
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
});
