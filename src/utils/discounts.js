/**
 * Sistema de descuentos por niveles (réplica de la web).
 * Combina nivel del USUARIO y descuento específico del PRODUCTO.
 */

/**
 * Busca un meta en el array meta_data de un producto WooCommerce.
 * @param {Object} product - Producto con meta_data: [{ id, key, value }, ...]
 * @param {string} key - Key del meta (ej: '_nivelpro_descuento_producto')
 * @returns {*} valor del meta o undefined si no existe
 */
export function getProductMeta(product, key) {
  if (!product || !key) return undefined;
  const meta = product.meta_data;
  if (!Array.isArray(meta)) return undefined;
  const item = meta.find((m) => m && m.key === key);
  return item === undefined ? undefined : item.value;
}

/**
 * Reglas del usuario EN ORDEN de prioridad.
 * @param {Object} user - Usuario del AuthContext (puede ser null)
 * @returns {{ tasa: number, motivo: string, nivel: string }}
 */
export function calcularDescuentoUsuario(user) {
  if (!user) {
    return { tasa: 0, motivo: 'Sin sesión', nivel: '-' };
  }

  const now = new Date();
  const mesActual = now.getMonth() + 1;
  const anioActual = now.getFullYear();

  // 1. Override Manual (prioridad máxima)
  if (user.overrideManual === true && user.overridePorcentaje > 0) {
    const tasa = Math.min(1, user.overridePorcentaje / 100);
    return {
      tasa,
      motivo: 'Override Manual',
      nivel: `MANUAL (${Math.round(user.overridePorcentaje)}%)`,
    };
  }

  // 2. Promoción de Febrero
  if (mesActual === 2) {
    return {
      tasa: 0.5,
      motivo: 'Promoción Especial',
      nivel: 'ORO (50%) - Promo',
    };
  }

  // 3. Usuario Nuevo (primer mes)
  if (user.registeredDate) {
    const reg = new Date(user.registeredDate);
    const mesReg = reg.getMonth() + 1;
    const anioReg = reg.getFullYear();
    if (mesReg === mesActual && anioReg === anioActual) {
      return {
        tasa: 0.5,
        motivo: 'Mes de Bienvenida',
        nivel: 'ORO (50%) - Bienvenida',
      };
    }
  }

  // 4. Vigencia ORO activa
  if (user.vigencia50) {
    const vigencia = new Date(user.vigencia50);
    if (now <= vigencia) {
      return {
        tasa: 0.5,
        motivo: 'Meta Alcanzada',
        nivel: 'ORO (50%)',
      };
    }
  }

  // 5. Nivel Estándar (default)
  return {
    tasa: 0.5,
    motivo: 'Nivel Estándar',
    nivel: 'ORO (50%)',
  };
}

/**
 * Descuento específico del producto (meta _nivelpro_descuento_producto o _es_precio_neto).
 * @param {Object} product
 * @returns {number|null} porcentaje 0-100 o null si usa nivel usuario
 */
export function obtenerDescuentoProducto(product) {
  const desc = getProductMeta(product, '_nivelpro_descuento_producto');
  if (desc !== null && desc !== undefined && desc !== '') {
    const num = parseFloat(desc);
    if (!isNaN(num) && num >= 0) return num;
  }
  const esNeto = getProductMeta(product, '_es_precio_neto');
  if (esNeto === 'yes') return 0;
  return null;
}

/**
 * Descuento efectivo para un producto + usuario (producto gana si tiene meta).
 * @param {Object} product
 * @param {Object|null} user
 * @returns {{ tasa: number, origen: 'producto'|'usuario', esNeto: boolean }}
 */
export function obtenerDescuentoEfectivo(product, user) {
  const descuentoProducto = getProductMeta(product, '_nivelpro_descuento_producto');
  if (descuentoProducto !== null && descuentoProducto !== undefined && descuentoProducto !== '') {
    const tasa = parseFloat(descuentoProducto) / 100;
    return {
      tasa: isNaN(tasa) ? 0 : Math.min(1, Math.max(0, tasa)),
      origen: 'producto',
      esNeto: parseFloat(descuentoProducto) === 0,
    };
  }
  const esNetoAntiguo = getProductMeta(product, '_es_precio_neto');
  if (esNetoAntiguo === 'yes') {
    return { tasa: 0, origen: 'producto', esNeto: true };
  }
  if (!user) {
    return { tasa: 0, origen: 'usuario', esNeto: true };
  }
  const statusUsuario = calcularDescuentoUsuario(user);
  return {
    tasa: statusUsuario.tasa,
    origen: 'usuario',
    esNeto: false,
  };
}

/**
 * Precio final y datos para mostrar.
 * @param {Object} product
 * @param {Object|null} user
 * @returns {{
 *   precioOriginal: number,
 *   precioFinal: number,
 *   descuento: number,
 *   porcentaje: number,
 *   esNeto: boolean,
 *   origen: 'producto'|'usuario',
 *   tieneDescuento: boolean
 * }}
 */
export function calcularPrecioFinal(product, user) {
  const precioOriginal =
    parseFloat(product.regular_price) ||
    parseFloat(product.price) ||
    0;
  const descuentoInfo = obtenerDescuentoEfectivo(product, user);
  const precioFinal = precioOriginal * (1 - descuentoInfo.tasa);
  const descuento = precioOriginal - precioFinal;
  const porcentaje = Math.round(descuentoInfo.tasa * 100);

  return {
    precioOriginal,
    precioFinal,
    descuento,
    porcentaje,
    esNeto: descuentoInfo.esNeto,
    origen: descuentoInfo.origen,
    tieneDescuento: descuentoInfo.tasa > 0,
  };
}
