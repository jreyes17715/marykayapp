// Reglas de carrito y mínimos de compra para Mary Kay RD
// Usado en validaciones de carrito, HomeScreen y StoreScreen.

// Estados posibles de una consultora
export const CONSULTANT_STATES = {
  NEW: 'new',
  ACTIVE: 'active',
  PENALIZED: 'penalized',
  DISABLED: 'disabled',
  BLOCKED: 'blocked',
  INACTIVE: 'inactive',
};

// IDs de productos especiales
export const KIT_PRODUCT_ID = 4994;
export const PREMIO_PRODUCT_ID = 6694;

// Mínimos de pedido según estado de consultora (en RD$)
export const MIN_AMOUNT_NEW = 20000;
export const MIN_AMOUNT_ACTIVE = 1000;
export const MIN_AMOUNT_PENALIZED = 20000;
export const MIN_AMOUNT_INACTIVE = 20000;

// Ventana de inactividad en meses (rolling window desde ultima compra calificada)
export const INACTIVE_GRACE_MONTHS = 3;

// Umbral trimestral para penalización (en RD$)
export const QUARTERLY_THRESHOLD = 20000;

// Umbral trimestral para regalo automático (PREMIO 6694) (en RD$)
export const REWARD_QUARTERLY_THRESHOLD = 60000;

// Meses de inactividad para reactivación de consultora DISABLED
export const DISABLED_MONTHS = 6;

// Umbral para regalo automático (PREMIO 6694) — alias por compatibilidad
export const PREMIO_THRESHOLD = 60000;
