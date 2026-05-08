// Funciones puras para el sistema de estados de consultora.
// Sin dependencias de React. Usadas por CartContext, checkout y pantallas de perfil.

import {
  CONSULTANT_STATES,
  MIN_AMOUNT_NEW,
  MIN_AMOUNT_ACTIVE,
  MIN_AMOUNT_PENALIZED,
  MIN_AMOUNT_INACTIVE,
  QUARTERLY_THRESHOLD,
  REWARD_QUARTERLY_THRESHOLD,
  DISABLED_MONTHS,
  KIT_PRODUCT_ID,
} from '../constants/cartRules';

// Conjunto de valores validos para validacion rapida
const VALID_STATES = new Set(Object.values(CONSULTANT_STATES));

/**
 * Encuentra una entrada en meta_data de WooCommerce por clave y retorna su valor.
 *
 * @param {Array<{ key: string, value: string }>|null} metaData - Array de meta entries
 * @param {string} key - Clave a buscar
 * @returns {string|null} Valor encontrado o null
 */
export function getUserMeta(metaData, key) {
  if (!Array.isArray(metaData)) return null;
  const entry = metaData.find((m) => m.key === key);
  return entry ? entry.value : null;
}

/**
 * Evalua si la consultora tiene una restriccion de compra activa.
 * Usa los campos del endpoint /kit/v1/status/{userId}:
 *   account_disabled → BLOCKED (prioridad maxima, no puede operar)
 *   need_reactivation → INACTIVE (puede comprar con minimo 20k seccion 2)
 *
 * @param {object} user - Objeto de usuario con campos accountDisabled y needReactivation
 * @returns {'blocked'|'inactive'|null}
 */
export function resolveRestrictionState(user) {
  if (user.accountDisabled) {
    return CONSULTANT_STATES.BLOCKED;
  }
  if (user.needReactivation) {
    return CONSULTANT_STATES.INACTIVE;
  }
  return null;
}

/**
 * Deriva el estado de consultora a partir de campos legacy del usuario.
 * Solo se usa cuando el usuario no tiene consultant_state guardado en meta.
 *
 * @param {object} user - Objeto de usuario con campo hasBoughtKit
 * @returns {string} Estado de consultora derivado
 */
export function deriveStateFromLegacy(user) {
  if (!user.hasBoughtKit) {
    return CONSULTANT_STATES.NEW;
  }
  return CONSULTANT_STATES.ACTIVE;
}

/**
 * Retorna el estado actual de la consultora.
 * Prioriza consultant_state guardado; si no existe o es invalido,
 * deriva desde campos legacy.
 *
 * @param {object} user - Objeto de usuario
 * @returns {string} Estado de consultora
 */
export function getConsultantState(user) {
  if (user.consultantState && VALID_STATES.has(user.consultantState)) {
    // Heal inconsistency: 'new' + hasBoughtKit = 'active'
    if (user.consultantState === CONSULTANT_STATES.NEW && user.hasBoughtKit === true) {
      return CONSULTANT_STATES.ACTIVE;
    }
    return user.consultantState;
  }
  return deriveStateFromLegacy(user);
}

/**
 * Calcula el inicio y fin del trimestre calendario que contiene la fecha dada.
 * Trimestres: Ene-Mar, Abr-Jun, Jul-Sep, Oct-Dic
 *
 * @param {Date} date - Fecha de referencia (por defecto hoy)
 * @returns {{ start: Date, end: Date }}
 */
export function getQuarterBounds(date = new Date()) {
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();

  // Determina el mes de inicio del trimestre (0, 3, 6 o 9)
  const startMonth = Math.floor(month / 3) * 3;

  const start = new Date(year, startMonth, 1, 0, 0, 0, 0);

  // El mes final del trimestre es startMonth + 2
  const endMonth = startMonth + 2;
  // Ultimo dia del mes final: dia 0 del mes siguiente
  const end = new Date(year, endMonth + 1, 0, 23, 59, 59, 999);

  return { start, end };
}

/**
 * Calcula los bounds del trimestre ANTERIOR al que contiene la fecha dada.
 *
 * @param {Date} date - Fecha de referencia (por defecto hoy)
 * @returns {{ start: Date, end: Date }}
 */
export function getPreviousQuarterBounds(date = new Date()) {
  const month = date.getMonth();
  const year = date.getFullYear();

  const startMonth = Math.floor(month / 3) * 3;

  // Retrocede un trimestre
  let prevStartMonth = startMonth - 3;
  let prevYear = year;
  if (prevStartMonth < 0) {
    prevStartMonth += 12;
    prevYear -= 1;
  }

  const start = new Date(prevYear, prevStartMonth, 1, 0, 0, 0, 0);
  const endMonth = prevStartMonth + 2;
  const end = new Date(prevYear, endMonth + 1, 0, 23, 59, 59, 999);

  return { start, end };
}

/**
 * Suma el total de ordenes completadas o en procesamiento dentro de un rango de fechas.
 *
 * @param {Array<object>} orders - Ordenes de WooCommerce con { status, total, date_completed, date_created }
 * @param {Date} quarterStart - Inicio del rango
 * @param {Date} quarterEnd - Fin del rango
 * @returns {number} Total acumulado en el periodo
 */
export function computeQuarterlyTotal(orders, quarterStart, quarterEnd) {
  const VALID_STATUSES = new Set(['completed', 'processing']);

  return orders
    .filter((order) => {
      // Solo ordenes en estados validos
      if (!VALID_STATUSES.has(order.status)) return false;

      // Fecha efectiva: date_completed si existe, sino date_created
      const rawDate = order.date_completed || order.date_created;
      if (!rawDate) return false;

      const orderDate = new Date(rawDate);
      return orderDate >= quarterStart && orderDate <= quarterEnd;
    })
    .reduce((sum, order) => sum + parseFloat(order.total), 0);
}

/**
 * Determina si la consultora debe ser penalizada por ventas insuficientes
 * en el trimestre anterior.
 *
 * @param {number} quarterlyTotal - Total de ventas del trimestre
 * @returns {boolean}
 */
export function shouldPenalize(quarterlyTotal) {
  return quarterlyTotal < QUARTERLY_THRESHOLD;
}

/**
 * Determina si la consultora es elegible para recibir el premio trimestral.
 *
 * @param {number} quarterlyTotal - Total de ventas del trimestre
 * @param {boolean} rewardRedeemed - Si ya canjeo el premio en este periodo
 * @returns {boolean}
 */
export function isRewardEligible(quarterlyTotal, rewardRedeemed) {
  return quarterlyTotal >= REWARD_QUARTERLY_THRESHOLD && rewardRedeemed !== true;
}

/**
 * Evalua si una consultora DISABLED puede reactivarse (han pasado 6+ meses
 * desde la fecha de bloqueo).
 *
 * @param {string|Date|null} blockedAt - Fecha en que fue bloqueada
 * @returns {boolean}
 */
export function canDisabledReactivate(blockedAt) {
  if (!blockedAt) return false;

  const blockedDate = new Date(blockedAt);
  const now = new Date();

  // Agrega DISABLED_MONTHS meses a la fecha de bloqueo
  const reactivationDate = new Date(blockedDate);
  reactivationDate.setMonth(reactivationDate.getMonth() + DISABLED_MONTHS);

  return now >= reactivationDate;
}

/**
 * Calcula la transicion de estado que debe ocurrir luego de una compra exitosa.
 * DISABLED se maneja por separado (flujo de reactivacion), no aqui.
 *
 * @param {string} currentState - Estado actual de la consultora
 * @param {number} orderTotal - Total de la orden en RD$
 * @param {boolean} hasBoughtKit - Si la consultora ya compro el kit anteriormente
 * @param {boolean} kitInCart - Si el kit esta en el carrito de esta orden
 * @returns {string|null} Nuevo estado o null si no hay transicion
 */
export function getTransitionAfterPurchase(currentState, orderTotal, hasBoughtKit, kitInCart) {
  if (currentState === CONSULTANT_STATES.NEW && kitInCart && orderTotal >= MIN_AMOUNT_NEW) {
    return CONSULTANT_STATES.ACTIVE;
  }

  if (currentState === CONSULTANT_STATES.PENALIZED && orderTotal >= MIN_AMOUNT_PENALIZED) {
    return CONSULTANT_STATES.ACTIVE;
  }

  if (currentState === CONSULTANT_STATES.INACTIVE && orderTotal >= MIN_AMOUNT_INACTIVE) {
    return CONSULTANT_STATES.ACTIVE;
  }

  return null;
}

/**
 * Construye el array de meta_data para actualizar en WooCommerce luego
 * de una transicion de estado.
 *
 * @param {string} newState - Nuevo estado de consultora
 * @param {object} extras - Campos adicionales opcionales
 * @param {boolean} [extras.hasBoughtKit] - Si compro el kit
 * @param {boolean} [extras.rewardRedeemed] - Si canjeo el premio
 * @param {boolean} [extras.rewardAvailable] - Si tiene premio disponible
 * @returns {Array<{ key: string, value: string }>}
 */
export function buildMetaUpdatesForTransition(newState, extras = {}) {
  const meta = [{ key: 'consultant_state', value: newState }];

  if (extras.hasBoughtKit) {
    meta.push({ key: 'has_bought_kit', value: 'yes' });
  }

  if (extras.rewardRedeemed) {
    meta.push({ key: 'reward_redeemed', value: 'yes' });
  }

  if (extras.rewardAvailable !== undefined) {
    meta.push({ key: 'reward_available', value: extras.rewardAvailable ? 'yes' : 'no' });
  }

  // Al reactivar desde INACTIVE, registrar el timestamp de la compra
  if (extras.fromInactive) {
    const nowTs = String(Math.floor(Date.now() / 1000));
    meta.push({ key: '_kit_last_active_purchase_ts', value: nowTs });
  }

  return meta;
}

/**
 * Retorna el monto minimo de pedido para un estado dado.
 * DISABLED retorna null porque no puede realizar compras.
 *
 * @param {string} state - Estado de consultora
 * @returns {number|null} Minimo en RD$ o null si no aplica
 */
export function getMinimumForState(state) {
  switch (state) {
    case CONSULTANT_STATES.NEW:
      return MIN_AMOUNT_NEW;
    case CONSULTANT_STATES.ACTIVE:
      return MIN_AMOUNT_ACTIVE;
    case CONSULTANT_STATES.PENALIZED:
      return MIN_AMOUNT_PENALIZED;
    case CONSULTANT_STATES.INACTIVE:
      return MIN_AMOUNT_INACTIVE;
    case CONSULTANT_STATES.DISABLED:
      return null;
    case CONSULTANT_STATES.BLOCKED:
      return null;
    default:
      return null;
  }
}

/**
 * Detecta si las ordenes COMPLETADAS del usuario justifican una transicion
 * de estado. Regla de negocio: la quita de penalizacion (y el resto de
 * transiciones de getTransitionAfterPurchase) solo aplica cuando la orden
 * esta en status='completed', no en processing/pending.
 *
 * Inspecciona la orden COMPLETADA mas reciente: si su total y composicion
 * gatillan una transicion segun getTransitionAfterPurchase, retorna los
 * datos para construir el meta update. Idempotente: retorna null si el
 * usuario ya esta en el estado destino o en estados terminales (BLOCKED,
 * DISABLED) que requieren otro flujo.
 *
 * @param {Array<object>} orders - Ordenes de WC con status, total, line_items, date_completed/date_created
 * @param {object} user - Usuario con consultantState, restrictionState, hasBoughtKit
 * @returns {{ newState: string, fromInactive: boolean, hasBoughtKit: boolean, kitInOrder: boolean } | null}
 */
export function findTransitionFromCompletedOrders(orders, user) {
  if (!Array.isArray(orders) || orders.length === 0) return null;
  if (!user) return null;

  const fromInactive = user.restrictionState === CONSULTANT_STATES.INACTIVE;
  const stateForTransition = fromInactive
    ? CONSULTANT_STATES.INACTIVE
    : user.consultantState;

  // Estados sin transicion-por-compra: ya activa, bloqueada, o disabled
  if (
    stateForTransition === CONSULTANT_STATES.ACTIVE ||
    stateForTransition === CONSULTANT_STATES.BLOCKED ||
    stateForTransition === CONSULTANT_STATES.DISABLED
  ) {
    return null;
  }

  // Tomar la orden completada mas reciente
  const latestCompleted = orders
    .filter((o) => o && o.status === 'completed')
    .sort((a, b) => {
      const da = new Date(a.date_completed || a.date_created || 0).getTime();
      const db = new Date(b.date_completed || b.date_created || 0).getTime();
      return db - da;
    })[0];

  if (!latestCompleted) return null;

  const orderTotal = parseFloat(latestCompleted.total) || 0;
  const kitInOrder = Array.isArray(latestCompleted.line_items)
    && latestCompleted.line_items.some((li) => li && li.product_id === KIT_PRODUCT_ID);

  const newState = getTransitionAfterPurchase(
    stateForTransition,
    orderTotal,
    user.hasBoughtKit,
    kitInOrder,
  );

  if (!newState || newState === stateForTransition) return null;

  return {
    newState,
    fromInactive,
    hasBoughtKit: !user.hasBoughtKit && kitInOrder,
    kitInOrder,
  };
}
