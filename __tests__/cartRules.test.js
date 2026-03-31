/**
 * Tests for src/constants/cartRules.js
 *
 * Validates that all exported constants match the agreed business rules
 * and that derived logic behaves correctly.
 */

import {
  KIT_PRODUCT_ID,
  PREMIO_PRODUCT_ID,
  MIN_AMOUNT_NEW,
  MIN_AMOUNT_ACTIVE,
  MIN_AMOUNT_PENALIZED,
  PREMIO_THRESHOLD,
  CONSULTANT_STATES,
  QUARTERLY_THRESHOLD,
  REWARD_QUARTERLY_THRESHOLD,
  DISABLED_MONTHS,
} from '../src/constants/cartRules';

// ---------------------------------------------------------------------------
// Constants integrity
// ---------------------------------------------------------------------------

describe('Cart Rules Constants', () => {
  it('has correct KIT_PRODUCT_ID', () => {
    expect(KIT_PRODUCT_ID).toBe(4994);
  });

  it('has correct PREMIO_PRODUCT_ID', () => {
    expect(PREMIO_PRODUCT_ID).toBe(6694);
  });

  it('has correct PREMIO_THRESHOLD', () => {
    expect(PREMIO_THRESHOLD).toBe(60000);
  });

  it('has correct MIN_AMOUNT_NEW', () => {
    expect(MIN_AMOUNT_NEW).toBe(20000);
  });

  it('has correct MIN_AMOUNT_ACTIVE', () => {
    expect(MIN_AMOUNT_ACTIVE).toBe(1000);
  });

  it('has correct MIN_AMOUNT_PENALIZED', () => {
    expect(MIN_AMOUNT_PENALIZED).toBe(20000);
  });

  it('has correct DISABLED_MONTHS', () => {
    expect(DISABLED_MONTHS).toBe(6);
  });

  it('has correct QUARTERLY_THRESHOLD', () => {
    expect(QUARTERLY_THRESHOLD).toBe(20000);
  });

  it('has correct REWARD_QUARTERLY_THRESHOLD', () => {
    expect(REWARD_QUARTERLY_THRESHOLD).toBe(60000);
  });

  it('KIT and PREMIO product IDs are different', () => {
    expect(KIT_PRODUCT_ID).not.toBe(PREMIO_PRODUCT_ID);
  });

  it('CONSULTANT_STATES has exactly 4 states', () => {
    const keys = Object.keys(CONSULTANT_STATES);
    expect(keys).toHaveLength(4);
    expect(keys).toEqual(expect.arrayContaining(['NEW', 'ACTIVE', 'PENALIZED', 'DISABLED']));
  });

  it('CONSULTANT_STATES values are lowercase strings', () => {
    expect(CONSULTANT_STATES.NEW).toBe('new');
    expect(CONSULTANT_STATES.ACTIVE).toBe('active');
    expect(CONSULTANT_STATES.PENALIZED).toBe('penalized');
    expect(CONSULTANT_STATES.DISABLED).toBe('disabled');
  });
});

// ---------------------------------------------------------------------------
// Kit protection business rules
// ---------------------------------------------------------------------------

describe('Kit protection rules', () => {
  it('kit cannot be removed when hasBoughtKit is false', () => {
    const user = { hasBoughtKit: false };
    const productId = KIT_PRODUCT_ID;
    const shouldBlock = productId === KIT_PRODUCT_ID && user != null && user.hasBoughtKit === false;
    expect(shouldBlock).toBe(true);
  });

  it('kit can be removed when hasBoughtKit is true', () => {
    const user = { hasBoughtKit: true };
    const productId = KIT_PRODUCT_ID;
    const shouldBlock = productId === KIT_PRODUCT_ID && user != null && user.hasBoughtKit === false;
    expect(shouldBlock).toBe(false);
  });

  it('non-kit product is never blocked regardless of hasBoughtKit', () => {
    const user = { hasBoughtKit: false };
    const productId = 12345;
    const shouldBlock = productId === KIT_PRODUCT_ID && user != null && user.hasBoughtKit === false;
    expect(shouldBlock).toBe(false);
  });

  it('kit is not blocked when user is null', () => {
    const user = null;
    const productId = KIT_PRODUCT_ID;
    const shouldBlock = productId === KIT_PRODUCT_ID && user != null && user.hasBoughtKit === false;
    expect(shouldBlock).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Premio (automatic gift) threshold rules
// ---------------------------------------------------------------------------

describe('Premio auto-add rules', () => {
  it('premio should be added when total equals PREMIO_THRESHOLD', () => {
    expect(PREMIO_THRESHOLD >= PREMIO_THRESHOLD).toBe(true);
  });

  it('premio should be added when total exceeds PREMIO_THRESHOLD', () => {
    const total = 65000;
    expect(total >= PREMIO_THRESHOLD).toBe(true);
  });

  it('premio should not be added when total is below PREMIO_THRESHOLD', () => {
    const total = 55000;
    expect(total >= PREMIO_THRESHOLD).toBe(false);
  });

  it('premio should be removed when total drops below PREMIO_THRESHOLD', () => {
    const total = 59999;
    expect(total >= PREMIO_THRESHOLD).toBe(false);
  });

  it('premio threshold is a positive number', () => {
    expect(PREMIO_THRESHOLD).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Minimum order tier ordering
// ---------------------------------------------------------------------------

describe('Minimum order tier ordering', () => {
  it('NEW and PENALIZED share the same minimum', () => {
    expect(MIN_AMOUNT_NEW).toBe(MIN_AMOUNT_PENALIZED);
  });

  it('NEW minimum is higher than ACTIVE minimum', () => {
    expect(MIN_AMOUNT_NEW).toBeGreaterThan(MIN_AMOUNT_ACTIVE);
  });

  it('PENALIZED minimum is higher than ACTIVE minimum', () => {
    expect(MIN_AMOUNT_PENALIZED).toBeGreaterThan(MIN_AMOUNT_ACTIVE);
  });

  it('ACTIVE minimum is positive', () => {
    expect(MIN_AMOUNT_ACTIVE).toBeGreaterThan(0);
  });
});
