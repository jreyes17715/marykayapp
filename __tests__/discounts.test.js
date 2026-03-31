/**
 * Tests for src/utils/discounts.js
 *
 * All user objects use registeredDate from a prior month to avoid the
 * "Mes de Bienvenida" (first-month) rule triggering unexpectedly.
 * Tests run in March 2026; registeredDate is set to January 2024.
 */

import {
  calcularPrecioFinal,
  calcularDescuentoUsuario,
  obtenerDescuentoProducto,
  obtenerDescuentoEfectivo,
  getProductMeta,
} from '../src/utils/discounts';

// A past registration date that is never in the current month during CI.
const PAST_REGISTERED = '2024-01-15T00:00:00.000Z';

// ---------------------------------------------------------------------------
// getProductMeta
// ---------------------------------------------------------------------------

describe('getProductMeta', () => {
  it('returns undefined when product is null', () => {
    expect(getProductMeta(null, '_some_key')).toBeUndefined();
  });

  it('returns undefined when key is missing', () => {
    const product = { meta_data: [{ key: '_other', value: '1' }] };
    expect(getProductMeta(product, '_missing')).toBeUndefined();
  });

  it('returns the value when key exists', () => {
    const product = { meta_data: [{ key: '_es_precio_neto', value: 'yes' }] };
    expect(getProductMeta(product, '_es_precio_neto')).toBe('yes');
  });

  it('returns undefined when meta_data is not an array', () => {
    const product = { meta_data: null };
    expect(getProductMeta(product, '_any')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// calcularDescuentoUsuario
// ---------------------------------------------------------------------------

describe('calcularDescuentoUsuario', () => {
  it('returns tasa 0 for null user', () => {
    const result = calcularDescuentoUsuario(null);
    expect(result.tasa).toBe(0);
    expect(result.motivo).toBe('Sin sesión');
    expect(result.nivel).toBe('-');
  });

  it('applies override manual with highest priority and caps at 1', () => {
    const user = {
      overrideManual: true,
      overridePorcentaje: 30,
      vigencia50: null,
      registeredDate: PAST_REGISTERED,
    };
    const result = calcularDescuentoUsuario(user);
    expect(result.tasa).toBe(0.3);
    expect(result.motivo).toBe('Override Manual');
    expect(result.nivel).toBe('MANUAL (30%)');
  });

  it('override manual ignores vigencia50', () => {
    const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const user = {
      overrideManual: true,
      overridePorcentaje: 20,
      vigencia50: futureDate,
      registeredDate: PAST_REGISTERED,
    };
    const result = calcularDescuentoUsuario(user);
    expect(result.tasa).toBe(0.2);
    expect(result.motivo).toBe('Override Manual');
    expect(result.nivel).toBe('MANUAL (20%)');
  });

  it('override manual does not apply when overridePorcentaje is 0', () => {
    const user = {
      overrideManual: true,
      overridePorcentaje: 0,
      vigencia50: null,
      registeredDate: PAST_REGISTERED,
    };
    // Falls through to standard 50%
    const result = calcularDescuentoUsuario(user);
    expect(result.tasa).toBe(0.5);
    expect(result.nivel).toBe('ORO (50%)');
  });

  it('applies 50% for active vigencia50', () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const user = {
      overrideManual: false,
      overridePorcentaje: 0,
      vigencia50: futureDate,
      registeredDate: PAST_REGISTERED,
    };
    const result = calcularDescuentoUsuario(user);
    expect(result.tasa).toBe(0.5);
    expect(result.motivo).toBe('Meta Alcanzada');
    expect(result.nivel).toBe('ORO (50%)');
  });

  it('ignores expired vigencia50 and falls back to standard', () => {
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const user = {
      overrideManual: false,
      overridePorcentaje: 0,
      vigencia50: pastDate,
      registeredDate: PAST_REGISTERED,
    };
    const result = calcularDescuentoUsuario(user);
    expect(result.tasa).toBe(0.5);
    expect(result.motivo).toBe('Nivel Estándar');
    expect(result.nivel).toBe('ORO (50%)');
  });

  it('applies default 50% for standard level user', () => {
    const user = {
      overrideManual: false,
      overridePorcentaje: 0,
      vigencia50: null,
      registeredDate: PAST_REGISTERED,
    };
    const result = calcularDescuentoUsuario(user);
    expect(result.tasa).toBe(0.5);
    expect(result.motivo).toBe('Nivel Estándar');
    expect(result.nivel).toBe('ORO (50%)');
  });
});

// ---------------------------------------------------------------------------
// obtenerDescuentoProducto
// ---------------------------------------------------------------------------

describe('obtenerDescuentoProducto', () => {
  it('returns null when meta_data is empty', () => {
    const product = { meta_data: [] };
    expect(obtenerDescuentoProducto(product)).toBeNull();
  });

  it('returns 0 for precio neto product (_es_precio_neto = yes)', () => {
    const product = {
      meta_data: [{ key: '_es_precio_neto', value: 'yes' }],
    };
    expect(obtenerDescuentoProducto(product)).toBe(0);
  });

  it('returns product-specific discount percentage', () => {
    const product = {
      meta_data: [{ key: '_nivelpro_descuento_producto', value: '25' }],
    };
    expect(obtenerDescuentoProducto(product)).toBe(25);
  });

  it('product-specific discount takes priority over precio neto', () => {
    const product = {
      meta_data: [
        { key: '_nivelpro_descuento_producto', value: '10' },
        { key: '_es_precio_neto', value: 'yes' },
      ],
    };
    // _nivelpro_descuento_producto is checked first
    expect(obtenerDescuentoProducto(product)).toBe(10);
  });

  it('returns null when _nivelpro_descuento_producto value is empty string', () => {
    const product = {
      meta_data: [{ key: '_nivelpro_descuento_producto', value: '' }],
    };
    expect(obtenerDescuentoProducto(product)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// obtenerDescuentoEfectivo
// ---------------------------------------------------------------------------

describe('obtenerDescuentoEfectivo', () => {
  const standardUser = {
    overrideManual: false,
    overridePorcentaje: 0,
    vigencia50: null,
    registeredDate: PAST_REGISTERED,
  };

  it('uses product meta when _nivelpro_descuento_producto exists', () => {
    const product = {
      meta_data: [{ key: '_nivelpro_descuento_producto', value: '25' }],
    };
    const result = obtenerDescuentoEfectivo(product, standardUser);
    expect(result.tasa).toBe(0.25);
    expect(result.origen).toBe('producto');
  });

  it('returns esNeto true for precio neto product', () => {
    const product = {
      meta_data: [{ key: '_es_precio_neto', value: 'yes' }],
    };
    const result = obtenerDescuentoEfectivo(product, standardUser);
    expect(result.tasa).toBe(0);
    expect(result.esNeto).toBe(true);
    expect(result.origen).toBe('producto');
  });

  it('falls back to user level when no product meta', () => {
    const product = { meta_data: [] };
    const result = obtenerDescuentoEfectivo(product, standardUser);
    expect(result.tasa).toBe(0.5);
    expect(result.origen).toBe('usuario');
    expect(result.esNeto).toBe(false);
  });

  it('returns tasa 0 and esNeto true when user is null and no product meta', () => {
    const product = { meta_data: [] };
    const result = obtenerDescuentoEfectivo(product, null);
    expect(result.tasa).toBe(0);
    expect(result.esNeto).toBe(true);
    expect(result.origen).toBe('usuario');
  });
});

// ---------------------------------------------------------------------------
// calcularPrecioFinal
// ---------------------------------------------------------------------------

describe('calcularPrecioFinal', () => {
  const baseUser = {
    overrideManual: false,
    overridePorcentaje: 0,
    vigencia50: null,
    registeredDate: PAST_REGISTERED,
  };

  it('applies 50% default discount for normal user', () => {
    const product = { regular_price: '1000', price: '1000', meta_data: [] };
    const result = calcularPrecioFinal(product, baseUser);
    expect(result.precioOriginal).toBe(1000);
    expect(result.precioFinal).toBe(500);
    expect(result.porcentaje).toBe(50);
    expect(result.tieneDescuento).toBe(true);
  });

  it('applies 0% discount for precio neto product', () => {
    const product = {
      regular_price: '800',
      price: '800',
      meta_data: [{ key: '_es_precio_neto', value: 'yes' }],
    };
    const result = calcularPrecioFinal(product, baseUser);
    expect(result.precioFinal).toBe(800);
    expect(result.esNeto).toBe(true);
    expect(result.porcentaje).toBe(0);
    expect(result.tieneDescuento).toBe(false);
  });

  it('applies product-specific discount instead of user level', () => {
    const product = {
      regular_price: '1000',
      price: '1000',
      meta_data: [{ key: '_nivelpro_descuento_producto', value: '25' }],
    };
    const result = calcularPrecioFinal(product, baseUser);
    expect(result.precioFinal).toBe(750);
    expect(result.porcentaje).toBe(25);
    expect(result.origen).toBe('producto');
  });

  it('applies override manual discount', () => {
    const user = { ...baseUser, overrideManual: true, overridePorcentaje: 30 };
    const product = { regular_price: '1000', price: '1000', meta_data: [] };
    const result = calcularPrecioFinal(product, user);
    expect(result.precioFinal).toBe(700);
    expect(result.porcentaje).toBe(30);
  });

  it('returns full price without user (no discount)', () => {
    const product = { regular_price: '1000', price: '1000', meta_data: [] };
    const result = calcularPrecioFinal(product, null);
    expect(result.precioFinal).toBe(1000);
    // null user + no product meta => esNeto true, so tieneDescuento false
    expect(result.tieneDescuento).toBe(false);
    expect(result.porcentaje).toBe(0);
  });

  it('uses regular_price over price when both are set', () => {
    const product = { regular_price: '2000', price: '1500', meta_data: [] };
    const result = calcularPrecioFinal(product, baseUser);
    // regular_price takes precedence
    expect(result.precioOriginal).toBe(2000);
    expect(result.precioFinal).toBe(1000);
  });

  it('falls back to price when regular_price is missing', () => {
    const product = { regular_price: '', price: '500', meta_data: [] };
    const result = calcularPrecioFinal(product, baseUser);
    expect(result.precioOriginal).toBe(500);
    expect(result.precioFinal).toBe(250);
  });

  it('calculates descuento amount correctly', () => {
    const product = { regular_price: '1000', price: '1000', meta_data: [] };
    const result = calcularPrecioFinal(product, baseUser);
    expect(result.descuento).toBe(result.precioOriginal - result.precioFinal);
  });
});
