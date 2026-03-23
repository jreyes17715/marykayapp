/**
 * Unit tests for pure utility functions in src/api/flai.js.
 *
 * expo-constants is mocked at the top level so the module-scope call to
 * Constants.expoConfig?.extra does not throw during import. Axios is imported
 * by flai.js as well but no network calls are made in these tests.
 */

// jest.mock is hoisted above import statements by Babel, so this mock is in
// place before flai.js evaluates its top-level Constants.expoConfig?.extra
// expression.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

import { cartItemsToFlaiProducts, getInsufficientStock } from '../flai';

// ---------------------------------------------------------------------------
// cartItemsToFlaiProducts
// ---------------------------------------------------------------------------

describe('cartItemsToFlaiProducts', () => {
  it('converts valid cart items to FLAI format', () => {
    const items = [
      { product: { name: 'Lipstick', sku: 'MK-001', price: '500' }, quantity: 2 },
      { product: { name: 'Cream', sku: 'MK-002', regular_price: '1000' }, quantity: 1 },
    ];
    const result = cartItemsToFlaiProducts(items);
    expect(result).toEqual([
      { product_name: 'Lipstick', default_code: 'MK-001', add_qty: 2 },
      { product_name: 'Cream', default_code: 'MK-002', add_qty: 1 },
    ]);
  });

  it('excludes items without SKU', () => {
    const items = [
      { product: { name: 'NoSku', sku: '', price: '500' }, quantity: 1 },
      { product: { name: 'NullSku', price: '500' }, quantity: 1 },
    ];
    expect(cartItemsToFlaiProducts(items)).toEqual([]);
  });

  it('excludes items with price <= 0 (gifts)', () => {
    const items = [
      { product: { name: 'Gift', sku: 'GIFT-01', price: '0' }, quantity: 1 },
    ];
    expect(cartItemsToFlaiProducts(items)).toEqual([]);
  });

  it('strips HTML from product names', () => {
    const items = [
      { product: { name: '<b>Bold</b> Product', sku: 'SK1', price: '100' }, quantity: 1 },
    ];
    const result = cartItemsToFlaiProducts(items);
    expect(result[0].product_name).toBe('Bold Product');
  });

  it('handles empty or invalid input', () => {
    expect(cartItemsToFlaiProducts([])).toEqual([]);
    expect(cartItemsToFlaiProducts(null)).toEqual([]);
    expect(cartItemsToFlaiProducts(undefined)).toEqual([]);
  });

  it('enforces minimum quantity of 1', () => {
    const items = [
      { product: { name: 'Item', sku: 'SK1', price: '100' }, quantity: 0 },
    ];
    const result = cartItemsToFlaiProducts(items);
    expect(result[0].add_qty).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getInsufficientStock
// ---------------------------------------------------------------------------

describe('getInsufficientStock', () => {
  it('returns empty when all stock is sufficient', () => {
    const requested = [
      { product_name: 'A', default_code: 'SK1', add_qty: 2 },
    ];
    const available = [
      { default_code: 'SK1', qtyRemain: 10 },
    ];
    expect(getInsufficientStock(requested, available)).toEqual([]);
  });

  it('returns insufficient items', () => {
    const requested = [
      { product_name: 'A', default_code: 'SK1', add_qty: 5 },
      { product_name: 'B', default_code: 'SK2', add_qty: 3 },
    ];
    const available = [
      { default_code: 'SK1', qtyRemain: 2 },
      { default_code: 'SK2', qtyRemain: 10 },
    ];
    const result = getInsufficientStock(requested, available);
    expect(result).toEqual([
      { product_name: 'A', default_code: 'SK1', requested: 5, available: 2 },
    ]);
  });

  it('treats missing SKU in availability as 0 stock', () => {
    const requested = [
      { product_name: 'X', default_code: 'MISSING', add_qty: 1 },
    ];
    const result = getInsufficientStock(requested, []);
    expect(result).toEqual([
      { product_name: 'X', default_code: 'MISSING', requested: 1, available: 0 },
    ]);
  });

  it('handles null inputs', () => {
    expect(getInsufficientStock(null, null)).toEqual([]);
    expect(getInsufficientStock([], null)).toEqual([]);
  });
});
