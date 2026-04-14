/**
 * Tests para src/utils/consultantState.js
 *
 * Cubre todas las funciones exportadas del modulo de estados de consultora.
 */

import {
  getUserMeta,
  resolveRestrictionState,
  deriveStateFromLegacy,
  getConsultantState,
  getQuarterBounds,
  getPreviousQuarterBounds,
  computeQuarterlyTotal,
  shouldPenalize,
  isRewardEligible,
  canDisabledReactivate,
  getTransitionAfterPurchase,
  buildMetaUpdatesForTransition,
  getMinimumForState,
} from '../consultantState';

import {
  CONSULTANT_STATES,
  MIN_AMOUNT_NEW,
  MIN_AMOUNT_ACTIVE,
  MIN_AMOUNT_PENALIZED,
  MIN_AMOUNT_INACTIVE,
  QUARTERLY_THRESHOLD,
  REWARD_QUARTERLY_THRESHOLD,
  DISABLED_MONTHS,
} from '../../constants/cartRules';

// ---------------------------------------------------------------------------
// getUserMeta
// ---------------------------------------------------------------------------

describe('getUserMeta', () => {
  it('retorna el valor cuando la clave existe en meta_data', () => {
    const meta = [
      { key: 'consultant_state', value: 'active' },
      { key: 'has_bought_kit', value: 'yes' },
    ];
    expect(getUserMeta(meta, 'consultant_state')).toBe('active');
    expect(getUserMeta(meta, 'has_bought_kit')).toBe('yes');
  });

  it('retorna null cuando la clave no existe', () => {
    const meta = [{ key: 'consultant_state', value: 'active' }];
    expect(getUserMeta(meta, 'clave_inexistente')).toBeNull();
  });

  it('retorna null cuando meta_data es un array vacio', () => {
    expect(getUserMeta([], 'consultant_state')).toBeNull();
  });

  it('retorna null cuando meta_data es null', () => {
    expect(getUserMeta(null, 'consultant_state')).toBeNull();
  });

  it('retorna null cuando meta_data es undefined', () => {
    expect(getUserMeta(undefined, 'consultant_state')).toBeNull();
  });

  it('retorna null cuando meta_data no es un array', () => {
    expect(getUserMeta('no-es-array', 'consultant_state')).toBeNull();
    expect(getUserMeta(42, 'consultant_state')).toBeNull();
    expect(getUserMeta({}, 'consultant_state')).toBeNull();
  });

  it('retorna la primera entrada que coincide con la clave', () => {
    const meta = [
      { key: 'estado', value: 'primero' },
      { key: 'estado', value: 'segundo' },
    ];
    expect(getUserMeta(meta, 'estado')).toBe('primero');
  });
});

// ---------------------------------------------------------------------------
// resolveRestrictionState
// ---------------------------------------------------------------------------

describe('resolveRestrictionState', () => {
  it('retorna BLOCKED cuando accountDisabled es true', () => {
    expect(resolveRestrictionState({ accountDisabled: true })).toBe(CONSULTANT_STATES.BLOCKED);
  });

  it('retorna INACTIVE cuando needReactivation es true', () => {
    expect(resolveRestrictionState({ accountDisabled: false, needReactivation: true })).toBe(
      CONSULTANT_STATES.INACTIVE
    );
  });

  it('BLOCKED tiene prioridad sobre INACTIVE', () => {
    expect(
      resolveRestrictionState({ accountDisabled: true, needReactivation: true })
    ).toBe(CONSULTANT_STATES.BLOCKED);
  });

  it('retorna null cuando no hay restricciones activas', () => {
    expect(resolveRestrictionState({ accountDisabled: false, needReactivation: false })).toBeNull();
  });

  it('retorna null cuando los campos de restriccion estan ausentes', () => {
    expect(resolveRestrictionState({})).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deriveStateFromLegacy
// ---------------------------------------------------------------------------

describe('deriveStateFromLegacy', () => {
  it('retorna NEW cuando la consultora no ha comprado el kit', () => {
    expect(deriveStateFromLegacy({ hasBoughtKit: false })).toBe(CONSULTANT_STATES.NEW);
  });

  it('retorna NEW cuando hasBoughtKit no esta definido', () => {
    expect(deriveStateFromLegacy({})).toBe(CONSULTANT_STATES.NEW);
  });

  it('retorna ACTIVE cuando la consultora ya compro el kit', () => {
    expect(deriveStateFromLegacy({ hasBoughtKit: true })).toBe(CONSULTANT_STATES.ACTIVE);
  });
});

// ---------------------------------------------------------------------------
// getConsultantState
// ---------------------------------------------------------------------------

describe('getConsultantState', () => {
  it('retorna NEW cuando consultantState es "new" y no ha comprado el kit', () => {
    const user = { consultantState: 'new', hasBoughtKit: false };
    expect(getConsultantState(user)).toBe(CONSULTANT_STATES.NEW);
  });

  it('sana inconsistencia: "new" + hasBoughtKit=true debe retornar ACTIVE', () => {
    const user = { consultantState: 'new', hasBoughtKit: true };
    expect(getConsultantState(user)).toBe(CONSULTANT_STATES.ACTIVE);
  });

  it('retorna ACTIVE cuando consultantState es "active"', () => {
    const user = { consultantState: 'active' };
    expect(getConsultantState(user)).toBe(CONSULTANT_STATES.ACTIVE);
  });

  it('retorna PENALIZED cuando consultantState es "penalized"', () => {
    const user = { consultantState: 'penalized' };
    expect(getConsultantState(user)).toBe(CONSULTANT_STATES.PENALIZED);
  });

  it('retorna DISABLED cuando consultantState es "disabled"', () => {
    const user = { consultantState: 'disabled' };
    expect(getConsultantState(user)).toBe(CONSULTANT_STATES.DISABLED);
  });

  it('retorna BLOCKED cuando consultantState es "blocked"', () => {
    const user = { consultantState: 'blocked' };
    expect(getConsultantState(user)).toBe(CONSULTANT_STATES.BLOCKED);
  });

  it('retorna INACTIVE cuando consultantState es "inactive"', () => {
    const user = { consultantState: 'inactive' };
    expect(getConsultantState(user)).toBe(CONSULTANT_STATES.INACTIVE);
  });

  it('deriva desde legacy cuando consultantState es invalido', () => {
    const user = { consultantState: 'estado_invalido', hasBoughtKit: false };
    expect(getConsultantState(user)).toBe(CONSULTANT_STATES.NEW);
  });

  it('deriva desde legacy cuando consultantState no existe', () => {
    const userSinKit = { hasBoughtKit: false };
    expect(getConsultantState(userSinKit)).toBe(CONSULTANT_STATES.NEW);

    const userConKit = { hasBoughtKit: true };
    expect(getConsultantState(userConKit)).toBe(CONSULTANT_STATES.ACTIVE);
  });

  it('deriva desde legacy cuando consultantState es null', () => {
    const user = { consultantState: null, hasBoughtKit: true };
    expect(getConsultantState(user)).toBe(CONSULTANT_STATES.ACTIVE);
  });
});

// ---------------------------------------------------------------------------
// getQuarterBounds
// ---------------------------------------------------------------------------

describe('getQuarterBounds', () => {
  it('Q1: enero-marzo — inicio el 1 ene y fin el 31 mar', () => {
    const fecha = new Date(2025, 1, 15); // 15 feb
    const { start, end } = getQuarterBounds(fecha);
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(0); // enero
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2025);
    expect(end.getMonth()).toBe(2); // marzo
    expect(end.getDate()).toBe(31);
  });

  it('Q2: abril-junio — inicio el 1 abr y fin el 30 jun', () => {
    const fecha = new Date(2025, 4, 10); // 10 mayo
    const { start, end } = getQuarterBounds(fecha);
    expect(start.getMonth()).toBe(3); // abril
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(5); // junio
    expect(end.getDate()).toBe(30);
  });

  it('Q3: julio-septiembre — inicio el 1 jul y fin el 30 sep', () => {
    const fecha = new Date(2025, 7, 20); // 20 agosto
    const { start, end } = getQuarterBounds(fecha);
    expect(start.getMonth()).toBe(6); // julio
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(8); // septiembre
    expect(end.getDate()).toBe(30);
  });

  it('Q4: octubre-diciembre — inicio el 1 oct y fin el 31 dic', () => {
    const fecha = new Date(2025, 10, 5); // 5 noviembre
    const { start, end } = getQuarterBounds(fecha);
    expect(start.getMonth()).toBe(9); // octubre
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(11); // diciembre
    expect(end.getDate()).toBe(31);
  });

  it('el primer dia del trimestre cae dentro del mismo trimestre', () => {
    const primeroAbril = new Date(2025, 3, 1);
    const { start, end } = getQuarterBounds(primeroAbril);
    expect(primeroAbril >= start && primeroAbril <= end).toBe(true);
  });

  it('el ultimo dia del trimestre cae dentro del mismo trimestre', () => {
    const treintaJunio = new Date(2025, 5, 30);
    const { start, end } = getQuarterBounds(treintaJunio);
    expect(treintaJunio >= start && treintaJunio <= end).toBe(true);
  });

  it('start tiene hora 00:00:00 y end tiene hora 23:59:59', () => {
    const fecha = new Date(2025, 0, 15);
    const { start, end } = getQuarterBounds(fecha);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
  });
});

// ---------------------------------------------------------------------------
// getPreviousQuarterBounds
// ---------------------------------------------------------------------------

describe('getPreviousQuarterBounds', () => {
  it('desde Q2 retorna bounds de Q1 del mismo anio', () => {
    const fecha = new Date(2025, 4, 10); // mayo (Q2)
    const { start, end } = getPreviousQuarterBounds(fecha);
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(0); // enero
    expect(end.getMonth()).toBe(2); // marzo
  });

  it('desde Q1 retorna bounds de Q4 del anio anterior', () => {
    const fecha = new Date(2025, 1, 15); // febrero (Q1)
    const { start, end } = getPreviousQuarterBounds(fecha);
    expect(start.getFullYear()).toBe(2024);
    expect(start.getMonth()).toBe(9); // octubre
    expect(end.getFullYear()).toBe(2024);
    expect(end.getMonth()).toBe(11); // diciembre
  });

  it('desde Q3 retorna bounds de Q2 del mismo anio', () => {
    const fecha = new Date(2025, 8, 1); // septiembre (Q3)
    const { start, end } = getPreviousQuarterBounds(fecha);
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(3); // abril
    expect(end.getMonth()).toBe(5); // junio
  });

  it('desde Q4 retorna bounds de Q3 del mismo anio', () => {
    const fecha = new Date(2025, 11, 31); // diciembre (Q4)
    const { start, end } = getPreviousQuarterBounds(fecha);
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(6); // julio
    expect(end.getMonth()).toBe(8); // septiembre
  });
});

// ---------------------------------------------------------------------------
// computeQuarterlyTotal
// ---------------------------------------------------------------------------

describe('computeQuarterlyTotal', () => {
  const start = new Date(2025, 0, 1); // 1 ene 2025
  const end = new Date(2025, 2, 31, 23, 59, 59, 999); // 31 mar 2025

  it('suma ordenes completadas dentro del trimestre', () => {
    const orders = [
      { status: 'completed', total: '15000', date_completed: '2025-02-10T10:00:00' },
      { status: 'completed', total: '10000', date_completed: '2025-03-15T10:00:00' },
    ];
    expect(computeQuarterlyTotal(orders, start, end)).toBe(25000);
  });

  it('suma ordenes en procesamiento dentro del trimestre', () => {
    const orders = [
      { status: 'processing', total: '8000', date_created: '2025-01-20T10:00:00' },
    ];
    expect(computeQuarterlyTotal(orders, start, end)).toBe(8000);
  });

  it('excluye ordenes canceladas', () => {
    const orders = [
      { status: 'completed', total: '20000', date_completed: '2025-02-01T10:00:00' },
      { status: 'cancelled', total: '5000', date_completed: '2025-02-05T10:00:00' },
    ];
    expect(computeQuarterlyTotal(orders, start, end)).toBe(20000);
  });

  it('excluye ordenes fuera del rango de fechas', () => {
    const orders = [
      { status: 'completed', total: '10000', date_completed: '2024-12-31T10:00:00' },
      { status: 'completed', total: '5000', date_completed: '2025-04-01T10:00:00' },
    ];
    expect(computeQuarterlyTotal(orders, start, end)).toBe(0);
  });

  it('usa date_completed si existe, sino date_created', () => {
    const orders = [
      { status: 'completed', total: '12000', date_completed: '2025-01-15T10:00:00', date_created: '2024-12-01T10:00:00' },
    ];
    // date_completed esta dentro del trimestre, date_created no
    expect(computeQuarterlyTotal(orders, start, end)).toBe(12000);
  });

  it('excluye ordenes sin fecha', () => {
    const orders = [
      { status: 'completed', total: '10000', date_completed: null, date_created: null },
    ];
    expect(computeQuarterlyTotal(orders, start, end)).toBe(0);
  });

  it('retorna 0 cuando no hay ordenes', () => {
    expect(computeQuarterlyTotal([], start, end)).toBe(0);
  });

  it('combina ordenes completadas y en procesamiento', () => {
    const orders = [
      { status: 'completed', total: '10000', date_completed: '2025-01-10T10:00:00' },
      { status: 'processing', total: '5000', date_created: '2025-02-10T10:00:00' },
      { status: 'cancelled', total: '20000', date_completed: '2025-03-01T10:00:00' },
    ];
    expect(computeQuarterlyTotal(orders, start, end)).toBe(15000);
  });
});

// ---------------------------------------------------------------------------
// shouldPenalize
// ---------------------------------------------------------------------------

describe('shouldPenalize', () => {
  it('penaliza cuando el total trimestral es menor al umbral', () => {
    expect(shouldPenalize(QUARTERLY_THRESHOLD - 1)).toBe(true);
  });

  it('penaliza cuando el total es cero', () => {
    expect(shouldPenalize(0)).toBe(true);
  });

  it('no penaliza cuando el total es exactamente igual al umbral', () => {
    expect(shouldPenalize(QUARTERLY_THRESHOLD)).toBe(false);
  });

  it('no penaliza cuando el total supera el umbral', () => {
    expect(shouldPenalize(QUARTERLY_THRESHOLD + 5000)).toBe(false);
  });

  it('el umbral de penalizacion coincide con RD$20,000', () => {
    expect(QUARTERLY_THRESHOLD).toBe(20000);
    expect(shouldPenalize(19999)).toBe(true);
    expect(shouldPenalize(20000)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isRewardEligible
// ---------------------------------------------------------------------------

describe('isRewardEligible', () => {
  it('es elegible cuando el total supera RD$60,000 y no ha canjeado', () => {
    expect(isRewardEligible(REWARD_QUARTERLY_THRESHOLD, false)).toBe(true);
  });

  it('es elegible cuando el total es exactamente RD$60,000 y no ha canjeado', () => {
    expect(isRewardEligible(60000, false)).toBe(true);
  });

  it('no es elegible cuando el total esta por debajo de RD$60,000', () => {
    expect(isRewardEligible(59999, false)).toBe(false);
  });

  it('no es elegible cuando ya canjeo el premio (rewardRedeemed=true)', () => {
    expect(isRewardEligible(80000, true)).toBe(false);
  });

  it('no es elegible cuando rewardRedeemed es true aunque supere el umbral', () => {
    expect(isRewardEligible(REWARD_QUARTERLY_THRESHOLD + 10000, true)).toBe(false);
  });

  it('es elegible cuando rewardRedeemed es false o undefined', () => {
    expect(isRewardEligible(70000, false)).toBe(true);
    expect(isRewardEligible(70000, undefined)).toBe(true);
  });

  it('el umbral del premio coincide con RD$60,000', () => {
    expect(REWARD_QUARTERLY_THRESHOLD).toBe(60000);
  });
});

// ---------------------------------------------------------------------------
// canDisabledReactivate
// ---------------------------------------------------------------------------

describe('canDisabledReactivate', () => {
  it('retorna false cuando blockedAt es null', () => {
    expect(canDisabledReactivate(null)).toBe(false);
  });

  it('retorna false cuando blockedAt es undefined', () => {
    expect(canDisabledReactivate(undefined)).toBe(false);
  });

  it('retorna false cuando no han pasado 6 meses desde el bloqueo', () => {
    // Bloqueada hace 3 meses
    const haceTreesMeses = new Date();
    haceTreesMeses.setMonth(haceTreesMeses.getMonth() - 3);
    expect(canDisabledReactivate(haceTreesMeses.toISOString())).toBe(false);
  });

  it('retorna true cuando han pasado exactamente 6 meses desde el bloqueo', () => {
    // Bloqueada hace 6 meses y un dia (para asegurar el >= en la comparacion)
    const hace6Meses = new Date();
    hace6Meses.setMonth(hace6Meses.getMonth() - DISABLED_MONTHS);
    hace6Meses.setDate(hace6Meses.getDate() - 1);
    expect(canDisabledReactivate(hace6Meses.toISOString())).toBe(true);
  });

  it('retorna true cuando han pasado mas de 6 meses', () => {
    const hace12Meses = new Date();
    hace12Meses.setFullYear(hace12Meses.getFullYear() - 1);
    expect(canDisabledReactivate(hace12Meses.toISOString())).toBe(true);
  });

  it('DISABLED_MONTHS es 6', () => {
    expect(DISABLED_MONTHS).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// getTransitionAfterPurchase
// ---------------------------------------------------------------------------

describe('getTransitionAfterPurchase', () => {
  // NEW -> ACTIVE
  it('NEW con kit en carrito y total >= 20,000 transiciona a ACTIVE', () => {
    expect(
      getTransitionAfterPurchase(CONSULTANT_STATES.NEW, MIN_AMOUNT_NEW, false, true)
    ).toBe(CONSULTANT_STATES.ACTIVE);
  });

  it('NEW con kit en carrito y total exactamente en el minimo transiciona a ACTIVE', () => {
    expect(
      getTransitionAfterPurchase(CONSULTANT_STATES.NEW, 20000, false, true)
    ).toBe(CONSULTANT_STATES.ACTIVE);
  });

  it('NEW sin kit en carrito no transiciona aunque supere el minimo', () => {
    expect(
      getTransitionAfterPurchase(CONSULTANT_STATES.NEW, 30000, false, false)
    ).toBeNull();
  });

  it('NEW con kit pero total menor al minimo no transiciona', () => {
    expect(
      getTransitionAfterPurchase(CONSULTANT_STATES.NEW, MIN_AMOUNT_NEW - 1, false, true)
    ).toBeNull();
  });

  // PENALIZED -> ACTIVE
  it('PENALIZED con total >= 20,000 transiciona a ACTIVE', () => {
    expect(
      getTransitionAfterPurchase(CONSULTANT_STATES.PENALIZED, MIN_AMOUNT_PENALIZED, false, false)
    ).toBe(CONSULTANT_STATES.ACTIVE);
  });

  it('PENALIZED con total exactamente en el minimo transiciona a ACTIVE', () => {
    expect(
      getTransitionAfterPurchase(CONSULTANT_STATES.PENALIZED, 20000, false, false)
    ).toBe(CONSULTANT_STATES.ACTIVE);
  });

  it('PENALIZED con total menor al minimo no transiciona', () => {
    expect(
      getTransitionAfterPurchase(CONSULTANT_STATES.PENALIZED, 19999, false, false)
    ).toBeNull();
  });

  // INACTIVE -> ACTIVE
  it('INACTIVE con total >= 20,000 transiciona a ACTIVE', () => {
    expect(
      getTransitionAfterPurchase(CONSULTANT_STATES.INACTIVE, MIN_AMOUNT_INACTIVE, false, false)
    ).toBe(CONSULTANT_STATES.ACTIVE);
  });

  it('INACTIVE con total menor al minimo no transiciona', () => {
    expect(
      getTransitionAfterPurchase(CONSULTANT_STATES.INACTIVE, 15000, false, false)
    ).toBeNull();
  });

  // Estados sin transicion
  it('ACTIVE no genera transicion', () => {
    expect(
      getTransitionAfterPurchase(CONSULTANT_STATES.ACTIVE, 50000, true, false)
    ).toBeNull();
  });

  it('DISABLED no genera transicion', () => {
    expect(
      getTransitionAfterPurchase(CONSULTANT_STATES.DISABLED, 50000, true, false)
    ).toBeNull();
  });

  it('BLOCKED no genera transicion', () => {
    expect(
      getTransitionAfterPurchase(CONSULTANT_STATES.BLOCKED, 50000, true, false)
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildMetaUpdatesForTransition
// ---------------------------------------------------------------------------

describe('buildMetaUpdatesForTransition', () => {
  it('siempre incluye consultant_state en el resultado', () => {
    const meta = buildMetaUpdatesForTransition(CONSULTANT_STATES.ACTIVE);
    expect(meta).toEqual(expect.arrayContaining([{ key: 'consultant_state', value: CONSULTANT_STATES.ACTIVE }]));
  });

  it('incluye has_bought_kit cuando extras.hasBoughtKit es true', () => {
    const meta = buildMetaUpdatesForTransition(CONSULTANT_STATES.ACTIVE, { hasBoughtKit: true });
    expect(meta).toEqual(expect.arrayContaining([{ key: 'has_bought_kit', value: 'yes' }]));
  });

  it('no incluye has_bought_kit cuando extras.hasBoughtKit es false', () => {
    const meta = buildMetaUpdatesForTransition(CONSULTANT_STATES.ACTIVE, { hasBoughtKit: false });
    const found = meta.find((m) => m.key === 'has_bought_kit');
    expect(found).toBeUndefined();
  });

  it('incluye reward_redeemed cuando extras.rewardRedeemed es true', () => {
    const meta = buildMetaUpdatesForTransition(CONSULTANT_STATES.ACTIVE, { rewardRedeemed: true });
    expect(meta).toEqual(expect.arrayContaining([{ key: 'reward_redeemed', value: 'yes' }]));
  });

  it('incluye reward_available con "yes" cuando extras.rewardAvailable es true', () => {
    const meta = buildMetaUpdatesForTransition(CONSULTANT_STATES.ACTIVE, { rewardAvailable: true });
    expect(meta).toEqual(expect.arrayContaining([{ key: 'reward_available', value: 'yes' }]));
  });

  it('incluye reward_available con "no" cuando extras.rewardAvailable es false', () => {
    const meta = buildMetaUpdatesForTransition(CONSULTANT_STATES.ACTIVE, { rewardAvailable: false });
    expect(meta).toEqual(expect.arrayContaining([{ key: 'reward_available', value: 'no' }]));
  });

  it('no incluye reward_available cuando no se define en extras', () => {
    const meta = buildMetaUpdatesForTransition(CONSULTANT_STATES.ACTIVE, {});
    const found = meta.find((m) => m.key === 'reward_available');
    expect(found).toBeUndefined();
  });

  it('incluye timestamp de compra cuando extras.fromInactive es true', () => {
    const meta = buildMetaUpdatesForTransition(CONSULTANT_STATES.ACTIVE, { fromInactive: true });
    const found = meta.find((m) => m.key === '_kit_last_active_purchase_ts');
    expect(found).toBeDefined();
    expect(typeof found.value).toBe('string');
    // El timestamp debe ser un numero valido en formato string
    expect(isNaN(Number(found.value))).toBe(false);
  });

  it('no incluye timestamp cuando extras.fromInactive no es true', () => {
    const meta = buildMetaUpdatesForTransition(CONSULTANT_STATES.ACTIVE, {});
    const found = meta.find((m) => m.key === '_kit_last_active_purchase_ts');
    expect(found).toBeUndefined();
  });

  it('sin extras solo retorna consultant_state', () => {
    const meta = buildMetaUpdatesForTransition(CONSULTANT_STATES.NEW);
    expect(meta).toHaveLength(1);
    expect(meta[0].key).toBe('consultant_state');
    expect(meta[0].value).toBe(CONSULTANT_STATES.NEW);
  });
});

// ---------------------------------------------------------------------------
// getMinimumForState
// ---------------------------------------------------------------------------

describe('getMinimumForState', () => {
  it('retorna MIN_AMOUNT_NEW para estado NEW', () => {
    expect(getMinimumForState(CONSULTANT_STATES.NEW)).toBe(MIN_AMOUNT_NEW);
  });

  it('retorna MIN_AMOUNT_ACTIVE para estado ACTIVE', () => {
    expect(getMinimumForState(CONSULTANT_STATES.ACTIVE)).toBe(MIN_AMOUNT_ACTIVE);
  });

  it('retorna MIN_AMOUNT_PENALIZED para estado PENALIZED', () => {
    expect(getMinimumForState(CONSULTANT_STATES.PENALIZED)).toBe(MIN_AMOUNT_PENALIZED);
  });

  it('retorna MIN_AMOUNT_INACTIVE para estado INACTIVE', () => {
    expect(getMinimumForState(CONSULTANT_STATES.INACTIVE)).toBe(MIN_AMOUNT_INACTIVE);
  });

  it('retorna null para estado DISABLED', () => {
    expect(getMinimumForState(CONSULTANT_STATES.DISABLED)).toBeNull();
  });

  it('retorna null para estado BLOCKED', () => {
    expect(getMinimumForState(CONSULTANT_STATES.BLOCKED)).toBeNull();
  });

  it('retorna null para estado desconocido', () => {
    expect(getMinimumForState('estado_invalido')).toBeNull();
    expect(getMinimumForState(undefined)).toBeNull();
    expect(getMinimumForState(null)).toBeNull();
  });

  it('los minimos coinciden con los valores esperados', () => {
    expect(MIN_AMOUNT_NEW).toBe(20000);
    expect(MIN_AMOUNT_ACTIVE).toBe(1000);
    expect(MIN_AMOUNT_PENALIZED).toBe(20000);
    expect(MIN_AMOUNT_INACTIVE).toBe(20000);
  });
});
