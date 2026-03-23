import {
  calcularPrecioFinal,
  calcularDescuentoUsuario,
  obtenerDescuentoProducto,
} from '../discounts';

// Capture the real Date constructor before any mocking so we can construct
// specific dates inside mocked implementations without infinite recursion.
const RealDate = Date;

// Helper to build a minimal WooCommerce product object
function makeProduct(regularPrice, metaData = []) {
  return {
    id: 1,
    regular_price: String(regularPrice),
    price: String(regularPrice),
    meta_data: metaData,
  };
}

function makeMeta(key, value) {
  return { id: Math.random(), key, value };
}

/**
 * Temporarily replaces the global Date constructor so that `new Date()` (no args)
 * returns a fixed date, while `new Date(arg)` still parses normally.
 * Returns the spy so tests can restore it.
 */
function mockDateTo(isoString) {
  const fixedDate = new RealDate(isoString);
  return jest.spyOn(global, 'Date').mockImplementation(function (arg) {
    if (arg !== undefined && arg !== null) return new RealDate(arg);
    return fixedDate;
  });
}

describe('calcularPrecioFinal', () => {
  it('returns 0% discount and esNeto=true when user is null', () => {
    const product = makeProduct(1000);
    const result = calcularPrecioFinal(product, null);

    expect(result.precioOriginal).toBe(1000);
    expect(result.precioFinal).toBe(1000);
    expect(result.descuento).toBe(0);
    expect(result.porcentaje).toBe(0);
    expect(result.esNeto).toBe(true);
    expect(result.tieneDescuento).toBe(false);
    expect(result.origen).toBe('usuario');
  });

  it('returns 50% discount for a base user (standard level)', () => {
    // Pin to a non-February month so the promo does not fire,
    // and use a registeredDate from a past month.
    const spy = mockDateTo('2025-07-15T12:00:00.000Z');

    const user = { registeredDate: '2024-01-01T00:00:00' };
    const product = makeProduct(1000);
    const result = calcularPrecioFinal(product, user);

    expect(result.porcentaje).toBe(50);
    expect(result.precioFinal).toBe(500);
    expect(result.descuento).toBe(500);
    expect(result.esNeto).toBe(false);
    expect(result.tieneDescuento).toBe(true);
    expect(result.origen).toBe('usuario');

    spy.mockRestore();
  });

  it('applies override manual percentage when user has overrideManual=true', () => {
    const user = { overrideManual: true, overridePorcentaje: 30 };
    const product = makeProduct(2000);
    const result = calcularPrecioFinal(product, user);

    expect(result.porcentaje).toBe(30);
    expect(result.precioFinal).toBeCloseTo(1400, 5);
    expect(result.descuento).toBeCloseTo(600, 5);
    expect(result.tieneDescuento).toBe(true);
    expect(result.origen).toBe('usuario');
  });

  it('uses product-level discount from _nivelpro_descuento_producto meta', () => {
    const user = { registeredDate: '2024-01-01T00:00:00' };
    const product = makeProduct(1000, [makeMeta('_nivelpro_descuento_producto', '40')]);
    const result = calcularPrecioFinal(product, user);

    expect(result.porcentaje).toBe(40);
    expect(result.precioFinal).toBeCloseTo(600, 5);
    expect(result.descuento).toBeCloseTo(400, 5);
    expect(result.origen).toBe('producto');
    expect(result.tieneDescuento).toBe(true);
  });

  it('returns 0% discount and esNeto=true for net price product (_es_precio_neto=yes)', () => {
    const user = { registeredDate: '2024-01-01T00:00:00' };
    const product = makeProduct(1500, [makeMeta('_es_precio_neto', 'yes')]);
    const result = calcularPrecioFinal(product, user);

    expect(result.porcentaje).toBe(0);
    expect(result.precioFinal).toBe(1500);
    expect(result.descuento).toBe(0);
    expect(result.esNeto).toBe(true);
    expect(result.tieneDescuento).toBe(false);
    expect(result.origen).toBe('producto');
  });
});

describe('calcularDescuentoUsuario', () => {
  it('returns 50% Promo when current month is February', () => {
    const spy = mockDateTo('2025-02-14T12:00:00.000Z');

    const user = { registeredDate: '2024-01-01T00:00:00' };
    const result = calcularDescuentoUsuario(user);

    expect(result.tasa).toBe(0.5);
    expect(result.motivo).toBe('Promoción Especial');
    expect(result.nivel).toContain('Promo');

    spy.mockRestore();
  });

  it('returns 50% Bienvenida when user registered in the current month', () => {
    // Pin to March 2026 (a non-February month). registeredDate is also March 2026.
    const spy = mockDateTo('2026-03-10T12:00:00.000Z');

    const user = { registeredDate: '2026-03-01T00:00:00' };
    const result = calcularDescuentoUsuario(user);

    expect(result.tasa).toBe(0.5);
    expect(result.motivo).toBe('Mes de Bienvenida');
    expect(result.nivel).toContain('Bienvenida');

    spy.mockRestore();
  });
});

describe('obtenerDescuentoProducto', () => {
  it('returns null for a normal product with no discount meta', () => {
    const product = makeProduct(500);
    expect(obtenerDescuentoProducto(product)).toBeNull();
  });
});
