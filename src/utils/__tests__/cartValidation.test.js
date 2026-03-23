import { validarCarrito } from '../cartValidation';
import { KIT_PRODUCT_ID, MIN_AMOUNT_NEW, MIN_AMOUNT_RETURNING, MIN_AMOUNT_REACTIVATION } from '../../constants/cartRules';

// Helper to build a cart item containing the kit product
function kitItem() {
  return { product: { id: KIT_PRODUCT_ID }, quantity: 1 };
}

function nonKitItem() {
  return { product: { id: 9999 }, quantity: 1 };
}

// Unix timestamp N days ago
function daysAgoTimestamp(days) {
  return Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
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

  describe('new customer (hasBoughtKit=false)', () => {
    const newUser = { hasBoughtKit: false };

    it('is invalid with type missing_kit when kit is not in cart', () => {
      const result = validarCarrito([nonKitItem()], newUser, 30000);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('missing_kit');
      expect(result.minRequired).toBe(MIN_AMOUNT_NEW);
    });

    it('is invalid with type new_customer when kit is in cart but total is below 25,000', () => {
      const result = validarCarrito([kitItem()], newUser, 10000);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('new_customer');
      expect(result.gap).toBe(MIN_AMOUNT_NEW - 10000);
      expect(result.minRequired).toBe(MIN_AMOUNT_NEW);
    });

    it('is valid when kit is in cart and total is at least 25,000', () => {
      const result = validarCarrito([kitItem()], newUser, 25000);
      expect(result.valid).toBe(true);
    });

    it('is valid when kit is in cart and total exceeds 25,000', () => {
      const result = validarCarrito([kitItem()], newUser, 30000);
      expect(result.valid).toBe(true);
    });
  });

  describe('returning customer (hasBoughtKit=true, recently active)', () => {
    // lastPurchaseDate 10 days ago — well within 90-day window, no reactivation
    const returningUser = {
      hasBoughtKit: true,
      lastPurchaseDate: daysAgoTimestamp(10),
    };

    it('is invalid with type returning when total is below 10,000', () => {
      const result = validarCarrito([nonKitItem()], returningUser, 5000);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('returning');
      expect(result.gap).toBe(MIN_AMOUNT_RETURNING - 5000);
      expect(result.minRequired).toBe(MIN_AMOUNT_RETURNING);
    });

    it('is valid when total is at least 10,000', () => {
      const result = validarCarrito([nonKitItem()], returningUser, 10000);
      expect(result.valid).toBe(true);
    });

    it('is valid when total exceeds 10,000', () => {
      const result = validarCarrito([nonKitItem()], returningUser, 15000);
      expect(result.valid).toBe(true);
    });
  });

  describe('reactivation customer (hasBoughtKit=true, 90+ days inactive)', () => {
    // lastPurchaseDate 100 days ago — triggers reactivation path
    const reactivationUser = {
      hasBoughtKit: true,
      lastPurchaseDate: daysAgoTimestamp(100),
    };

    it('is invalid with type reactivation when total is below 20,000', () => {
      const result = validarCarrito([nonKitItem()], reactivationUser, 10000);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('reactivation');
      expect(result.gap).toBe(MIN_AMOUNT_REACTIVATION - 10000);
      expect(result.minRequired).toBe(MIN_AMOUNT_REACTIVATION);
    });

    it('is valid when total is at least 20,000', () => {
      const result = validarCarrito([nonKitItem()], reactivationUser, 20000);
      expect(result.valid).toBe(true);
    });

    it('is valid when total exceeds 20,000', () => {
      const result = validarCarrito([nonKitItem()], reactivationUser, 25000);
      expect(result.valid).toBe(true);
    });
  });
});
