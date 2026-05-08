import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loginUser,
  validateToken,
  getCurrentWPUser,
  findCustomerByEmail,
  getOrdersByCustomer,
  updateCustomer,
  getAccountStatus,
} from '../api/woocommerce';
import { CONSULTANT_STATES } from '../constants/cartRules';
import {
  getUserMeta,
  getConsultantState,
  getQuarterBounds,
  computeQuarterlyTotal,
  isRewardEligible,
  resolveRestrictionState,
  findTransitionFromCompletedOrders,
  buildMetaUpdatesForTransition,
} from '../utils/consultantState';

const REFRESH_THROTTLE_MS = 5000;

const TOKEN_STORAGE_KEY = '@marykay_jwt_token';

export const AuthContext = createContext({});

function parseBool(val) {
  if (val === true || val === 'yes' || val === '1') return true;
  if (val === false || val === 'no' || val === '0' || val === '') return false;
  return !!val;
}

function buildDiscountLevel(metaData) {
  // Por ahora nivel calculado simple; se puede refinar con meta_data
  const override = parseBool(getUserMeta(metaData, '_nivelpro_override_manual'));
  const overridePct = Number(getUserMeta(metaData, '_nivelpro_override_porcentaje')) || 0;
  if (override && overridePct > 0) return { level: 'override', rate: Math.min(1, overridePct / 100) };
  const vigencia50 = getUserMeta(metaData, '_nivelpro_descuento_50_hasta');
  if (vigencia50 && new Date(vigencia50) > new Date()) return { level: 'oro', rate: 0.5 };
  return { level: 'base', rate: 0 };
}

async function buildUserFromToken(token, initialEmail) {
  const wpResult = await getCurrentWPUser(token);
  if (!wpResult.success || !wpResult.data) {
    return { success: false, error: wpResult.error || 'No se pudo obtener el usuario' };
  }
  const wpUser = wpResult.data;
  const email = (initialEmail || wpUser.email || wpUser.user_email || '').trim();

  const custResult = await findCustomerByEmail(email);
  const customer = custResult.data || null;

  if (customer) {
    const metaData = customer.meta_data || [];
    const { level: discountLevel, rate: discountRate } = buildDiscountLevel(metaData);
    const freeShippingUntil = getUserMeta(metaData, '_free_shipping_until') || null;

    const consultantStateRaw = getUserMeta(metaData, 'consultant_state') || null;
    const rewardAvailable = parseBool(getUserMeta(metaData, 'reward_available'));
    const rewardRedeemed = parseBool(getUserMeta(metaData, 'reward_redeemed'));
    const lastActivePurchaseTs = getUserMeta(metaData, '_kit_last_active_purchase_ts') || null;

    const resolvedConsultantState =
      consultantStateRaw ||
      getConsultantState({ hasBoughtKit: parseBool(getUserMeta(metaData, 'has_bought_kit')) });

    // Consultar endpoint /kit/v1/status/{userId} para estado de cuenta
    // FIX: inactive-bypass-bug — fail SAFE on network/endpoint error.
    // Was: catch block left needReactivation=false, silently downgrading an INACTIVE
    //      user to their base consultantState (e.g. 'active'), bypassing the 20k minimum.
    // Now: if the status endpoint fails, statusResolved=false and we re-read the
    //      meta field _kit_activa_confirmada as a fallback. Only if both sources
    //      are unavailable do we assume active (can't block access on infra failure).
    let accountDisabled = false;
    let needReactivation = false;
    let statusResolved = false;
    try {
      const statusResult = await getAccountStatus(wpUser.id);
      if (statusResult.success) {
        accountDisabled = statusResult.accountDisabled;
        needReactivation = statusResult.needReactivation;
        statusResolved = true;
      }
    } catch (e) {
      console.warn('[AUTH] getAccountStatus falló — usando fallback de meta_data:', e?.message);
    }
    // Fallback: if the endpoint was unreachable, derive restriction state from
    // the _kit_activa_confirmada meta written by the wp-kit-restrictor plugin.
    // null or '' → not yet confirmed active → treat as needs reactivation.
    if (!statusResolved) {
      const kitConfirmada = getUserMeta(metaData, '_kit_activa_confirmada');
      // Only treat as reactivation-needed when the meta explicitly marks inactivity.
      // '0' means inactive; null/'' means unset (treat as active to avoid false blocks).
      if (kitConfirmada === '0') {
        needReactivation = true;
      }
    }

    const effectiveConsultantState =
      needReactivation ? CONSULTANT_STATES.INACTIVE : resolvedConsultantState;

    const user = {
      id: wpUser.id,
      customerId: customer.id,
      email: customer.email || email,
      displayName: (() => {
        const raw = (customer.first_name && customer.last_name)
          ? `${customer.first_name} ${customer.last_name}`.trim()
          : (wpUser.name || wpUser.user_display_name || customer.username || email);
        return (typeof raw === 'string' && raw.startsWith('@ud_'))
          ? (customer.first_name || customer.last_name || email || 'Consultora')
          : raw;
      })(),
      firstName: customer.first_name || '',
      lastName: customer.last_name || '',
      token,
      billing: customer.billing || {},
      shipping: customer.shipping || {},
      meta_data: metaData,
      hasBoughtKit: parseBool(getUserMeta(metaData, 'has_bought_kit')),
      lastPurchaseDate: getUserMeta(metaData, '_kit_last_purchase_date') || null,
      discountLevel,
      discountRate,
      vigencia50: getUserMeta(metaData, '_nivelpro_descuento_50_hasta') || null,
      overrideManual: parseBool(getUserMeta(metaData, '_nivelpro_override_manual')),
      overridePorcentaje: Number(getUserMeta(metaData, '_nivelpro_override_porcentaje')) || 0,
      registeredDate: customer.date_created || '',
      salesCurrentMonth: 0,
      freeShippingUntil,
      hasFreeShipping: freeShippingUntil != null && new Date(freeShippingUntil) > new Date(),
      consultantState: effectiveConsultantState,
      accountDisabled,
      needReactivation,
      rewardAvailable,
      rewardRedeemed,
      isDisabled: effectiveConsultantState === CONSULTANT_STATES.DISABLED,
      lastActivePurchaseTs,
      restrictionState: null,
    };
    user.restrictionState = resolveRestrictionState(user);
    return { success: true, user };
  }

  // Sin customer en WooCommerce: entrar con datos básicos del JWT/WP
  const rawDisplayName = wpUser.name || wpUser.user_display_name || wpUser.nicename || email || 'Usuario';
  const displayName = (typeof rawDisplayName === 'string' && rawDisplayName.startsWith('@ud_'))
    ? (email || 'Usuario')
    : rawDisplayName;
  const user = {
    id: wpUser.id,
    customerId: 0,
    email: email || wpUser.email || wpUser.user_email || '',
    displayName: typeof displayName === 'string' ? displayName : 'Usuario',
    firstName: '',
    lastName: '',
    token,
    billing: {},
    shipping: {},
    meta_data: [],
    hasBoughtKit: false,
    lastPurchaseDate: null,
    discountLevel: 'base',
    discountRate: 0.5,
    vigencia50: null,
    overrideManual: false,
    overridePorcentaje: 0,
    registeredDate: '',
    salesCurrentMonth: 0,
    freeShippingUntil: null,
    hasFreeShipping: false,
    consultantState: CONSULTANT_STATES.NEW,
    accountDisabled: false,
    needReactivation: false,
    rewardAvailable: false,
    rewardRedeemed: false,
    isDisabled: false,
    lastActivePurchaseTs: null,
    restrictionState: null,
  };
  return { success: true, user };
}

// Aplica los guards monotonicos al cruzar un user fresco con el previo:
// - customerId race: si prev tenia id valido y next devuelve 0/null (eventual
//   consistency de WC tras un PATCH), preservar el prev.
// - hasBoughtKit: una vez true, nunca revertir; si quedaba en NEW, promover a ACTIVE.
function mergeFreshUser(prev, fresh) {
  let next = { ...fresh };
  if (prev?.customerId > 0 && (!next.customerId || next.customerId <= 0)) {
    console.warn('[AUTH] mergeFreshUser: fresh.customerId is invalid; preserving prev.customerId for session continuity.');
    next = { ...next, customerId: Number(prev.customerId) };
  }
  if (prev?.hasBoughtKit && !next.hasBoughtKit) {
    next = { ...next, hasBoughtKit: true };
    if (next.consultantState === CONSULTANT_STATES.NEW) {
      next = { ...next, consultantState: CONSULTANT_STATES.ACTIVE };
    }
    next = { ...next, restrictionState: resolveRestrictionState(next) };
  }
  return next;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastRefreshAtRef = useRef(0);
  const userRef = useRef(null);
  const refreshUserDataRef = useRef(null);

  // Mantener userRef sincronizado para lecturas sincronas (Concurrent Mode safe)
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const isLoggedIn = !!user;

  const loadUserFromToken = useCallback(async (token, initialEmail) => {
    const result = await buildUserFromToken(token, initialEmail);
    if (result.success) {
      setUser(result.user);
      return result.user;
    }
    throw new Error(result.error);
  }, []);

  // Detecta y aplica transicion de estado por orden completed.
  // Llamado desde login, boot, refreshUserData. Idempotente: si no aplica
  // transicion, retorna false sin tocar nada.
  const detectAndApplyCompletedTransition = useCallback(async (currentUser, ordersOverride) => {
    if (!currentUser?.customerId || currentUser.customerId <= 0) return false;

    const fromInactive = currentUser.restrictionState === CONSULTANT_STATES.INACTIVE;
    const stateForTransition = fromInactive
      ? CONSULTANT_STATES.INACTIVE
      : currentUser.consultantState;
    if (
      stateForTransition === CONSULTANT_STATES.ACTIVE ||
      stateForTransition === CONSULTANT_STATES.BLOCKED ||
      stateForTransition === CONSULTANT_STATES.DISABLED
    ) {
      return false;
    }

    try {
      // Permitir reusar ordenes ya cargadas (evita doble fetch en login/boot)
      let orders = ordersOverride;
      if (!orders) {
        const ordersResult = await getOrdersByCustomer(currentUser.customerId);
        if (!ordersResult.success || !ordersResult.data) return false;
        orders = ordersResult.data;
      }

      const transition = findTransitionFromCompletedOrders(orders, currentUser);
      if (!transition) return false;

      const transitionMeta = buildMetaUpdatesForTransition(transition.newState, {
        hasBoughtKit: transition.hasBoughtKit,
        fromInactive: transition.fromInactive,
      });

      await updateCustomer(currentUser.customerId, { meta_data: transitionMeta });

      setUser((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          consultantState: transition.newState,
          hasBoughtKit: transition.hasBoughtKit ? true : prev.hasBoughtKit,
        };
        if (transition.fromInactive) {
          updated.needReactivation = false;
          updated.lastActivePurchaseTs = String(Math.floor(Date.now() / 1000));
        }
        updated.restrictionState = resolveRestrictionState(updated);
        return updated;
      });
      return true;
    } catch (e) {
      console.log('[AUTH] detectAndApplyCompletedTransition error:', e?.message);
      return false;
    }
  }, []);

  const persistToken = useCallback(async (token) => {
    try {
      if (token) {
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const evaluateQuarterlyStatus = useCallback(async (currentUser, ordersOverride) => {
    if (!currentUser?.customerId) return;

    try {
      // Permitir reusar ordenes ya cargadas (evita doble fetch en login/boot)
      let orders = ordersOverride;
      if (!orders) {
        const ordersResult = await getOrdersByCustomer(currentUser.customerId);
        if (!ordersResult.success || !ordersResult.data) return;
        orders = ordersResult.data;
      }

      const metaUpdates = [];
      let newState = currentUser.consultantState;

      // Inactividad se maneja por backend via endpoint /kit/v1/status — no recalcular en frontend

      // Evaluar elegibilidad de reward (usa trimestre actual)
      const currentQuarter = getQuarterBounds();
      const currentQuarterlyTotal = computeQuarterlyTotal(orders, currentQuarter.start, currentQuarter.end);

      if (isRewardEligible(currentQuarterlyTotal, currentUser.rewardRedeemed) && !currentUser.rewardAvailable) {
        metaUpdates.push({ key: 'reward_available', value: 'yes' });
      }

      // Actualizar en WooCommerce si hay cambios
      if (metaUpdates.length > 0) {
        await updateCustomer(currentUser.customerId, { meta_data: metaUpdates });

        setUser((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            consultantState: newState,
            rewardAvailable: metaUpdates.some((m) => m.key === 'reward_available') ? true : prev.rewardAvailable,
          };
          updated.restrictionState = resolveRestrictionState(updated);
          return updated;
        });
      }
    } catch (e) {
      // Silenciar errores de evaluacion trimestral — no debe bloquear el uso
      console.log('[AUTH] Error evaluando estado trimestral:', e.message);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    const result = await loginUser(username, password);
    if (!result.success) {
      throw new Error(result.error || 'Credenciales incorrectas');
    }
    const { token, user_email } = result.data;

    // Construir user para verificar estado antes de persistir
    const buildResult = await buildUserFromToken(token, user_email);
    if (!buildResult.success) {
      throw new Error(buildResult.error);
    }

    // Ya no bloqueamos login aqui. Cuentas con account_disabled=true entran
    // y AppNavigator las redirige a BlockedScreen. Cuentas con needs_reactivation=true
    // entran como INACTIVE y ven el banner + minimo de 20k.

    await persistToken(token);
    setUser(buildResult.user);

    // Fetchear ordenes UNA vez y compartir entre quarterly + transition (no bloquear login)
    (async () => {
      try {
        const ordersResult = await getOrdersByCustomer(buildResult.user.customerId);
        const orders = ordersResult?.success ? ordersResult.data : null;

        if (buildResult.user.consultantState === CONSULTANT_STATES.ACTIVE ||
            buildResult.user.consultantState === CONSULTANT_STATES.INACTIVE) {
          evaluateQuarterlyStatus(buildResult.user, orders).catch(() => {});
        }
        detectAndApplyCompletedTransition(buildResult.user, orders).catch(() => {});
      } catch (e) {
        // Background — no bloquear login
      }
    })();

    return buildResult.user;
  }, [persistToken, evaluateQuarterlyStatus, detectAndApplyCompletedTransition]);

  const logout = useCallback(() => {
    setUser(null);
    persistToken(null);
  }, [persistToken]);

  const refreshUserData = useCallback(async (options = {}) => {
    if (!user?.token) return;
    const force = options?.force === true;
    const now = Date.now();
    if (!force && (now - lastRefreshAtRef.current) < REFRESH_THROTTLE_MS) {
      return;
    }
    lastRefreshAtRef.current = now;

    try {
      const result = await buildUserFromToken(user.token);
      if (!result.success) throw new Error(result.error);

      // Merge fuera de setUser (Concurrent Mode safe). Lee prev via ref.
      const merged = mergeFreshUser(userRef.current, result.user);
      setUser(merged);

      // Detectar transicion por orden completed (puede aplicar PATCH adicional)
      await detectAndApplyCompletedTransition(merged);
    } catch (e) {
      logout();
    }
  }, [user?.token, logout, detectAndApplyCompletedTransition]);

  const isTokenValid = useCallback(async () => {
    if (!user?.token) return false;
    const result = await validateToken(user.token);
    return result.success;
  }, [user?.token]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(TOKEN_STORAGE_KEY)
      .then(async (token) => {
        if (cancelled || !token) {
          setIsLoading(false);
          return;
        }
        const result = await validateToken(token);
        if (cancelled) return;
        if (result.success) {
          try {
            const buildResult = await buildUserFromToken(token);
            if (cancelled) return;
            if (buildResult.success) {
              setUser(buildResult.user);
              // Fetchear ordenes UNA vez y compartir
              (async () => {
                try {
                  const ordersResult = await getOrdersByCustomer(buildResult.user.customerId);
                  if (cancelled) return;
                  const orders = ordersResult?.success ? ordersResult.data : null;

                  if (buildResult.user.consultantState === CONSULTANT_STATES.ACTIVE ||
                      buildResult.user.consultantState === CONSULTANT_STATES.INACTIVE) {
                    evaluateQuarterlyStatus(buildResult.user, orders).catch(() => {});
                  }
                  detectAndApplyCompletedTransition(buildResult.user, orders).catch(() => {});
                } catch (e) {
                  // Background — no bloquear boot
                }
              })();
            } else {
              await persistToken(null);
            }
          } catch (e) {
            await persistToken(null);
          }
        } else {
          await persistToken(null);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    return () => { cancelled = true; };
  }, [evaluateQuarterlyStatus, persistToken, detectAndApplyCompletedTransition]);

  // Mantener refreshUserDataRef sincronizado para que el AppState listener
  // no se re-suscriba en cada re-render (refreshUserData cambia identidad).
  useEffect(() => {
    refreshUserDataRef.current = refreshUserData;
  }, [refreshUserData]);

  // Refrescar datos al volver la app a foreground (throttled a 5s).
  // Lee refreshUserData via ref para evitar re-suscripciones innecesarias.
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshUserDataRef.current?.().catch(() => {});
      }
    });
    return () => {
      subscription?.remove?.();
    };
  }, [isLoggedIn]);

  const value = useMemo(() => ({
    user,
    isLoggedIn,
    isLoading,
    login,
    logout,
    refreshUserData,
    isTokenValid,
    evaluateQuarterlyStatus,
  }), [user, isLoggedIn, isLoading, login, logout, refreshUserData, isTokenValid, evaluateQuarterlyStatus]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
