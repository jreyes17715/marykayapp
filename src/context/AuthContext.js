import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loginUser,
  validateToken,
  getCurrentWPUser,
  findCustomerByEmail,
  getOrdersByCustomer,
  updateCustomer,
} from '../api/woocommerce';
import { CONSULTANT_STATES } from '../constants/cartRules';
import {
  getUserMeta,
  getConsultantState,
  getQuarterBounds,
  computeQuarterlyTotal,
  isRewardEligible,
  resolveRestrictionState,
  shouldMarkInactive,
} from '../utils/consultantState';

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
    const blockedAt = getUserMeta(metaData, 'blocked_at') || null;
    const rewardAvailable = parseBool(getUserMeta(metaData, 'reward_available'));
    const rewardRedeemed = parseBool(getUserMeta(metaData, 'reward_redeemed'));
    const lastActivePurchaseTs = getUserMeta(metaData, '_kit_last_active_purchase_ts') || null;

    const resolvedConsultantState =
      consultantStateRaw ||
      getConsultantState({ hasBoughtKit: parseBool(getUserMeta(metaData, 'has_bought_kit')) });

    // Bug9: pre-apply inactivity check synchronously so resolveRestrictionState works correctly
    const effectiveConsultantState =
      (resolvedConsultantState === CONSULTANT_STATES.ACTIVE && shouldMarkInactive(lastActivePurchaseTs))
        ? CONSULTANT_STATES.INACTIVE
        : resolvedConsultantState;

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
      blockedAt,
      rewardAvailable,
      rewardRedeemed,
      isDisabled: effectiveConsultantState === CONSULTANT_STATES.DISABLED,
      lastActivePurchaseTs,
      isBlocked: false,
      restrictionState: null,
    };
    user.restrictionState = resolveRestrictionState(user);
    user.isBlocked = user.restrictionState === CONSULTANT_STATES.BLOCKED;
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
    blockedAt: null,
    rewardAvailable: false,
    rewardRedeemed: false,
    isDisabled: false,
    lastActivePurchaseTs: null,
    isBlocked: false,
    restrictionState: null,
  };
  return { success: true, user };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isLoggedIn = !!user;

  const loadUserFromToken = useCallback(async (token, initialEmail) => {
    const result = await buildUserFromToken(token, initialEmail);
    if (result.success) {
      setUser(result.user);
      return result.user;
    }
    throw new Error(result.error);
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

  const evaluateQuarterlyStatus = useCallback(async (currentUser) => {
    if (!currentUser?.customerId) return;

    try {
      // Obtener ordenes del cliente
      const ordersResult = await getOrdersByCustomer(currentUser.customerId);
      if (!ordersResult.success || !ordersResult.data) return;

      const orders = ordersResult.data;
      const metaUpdates = [];
      let newState = currentUser.consultantState;

      // Evaluar inactividad rolling (reemplaza penalizacion trimestral fija)
      if (currentUser.consultantState === CONSULTANT_STATES.ACTIVE) {
        const lastTs = getUserMeta(currentUser.meta_data, '_kit_last_active_purchase_ts');
        if (shouldMarkInactive(lastTs)) {
          newState = CONSULTANT_STATES.INACTIVE;
          metaUpdates.push({ key: 'consultant_state', value: CONSULTANT_STATES.INACTIVE });
        }
      }

      // Evaluar elegibilidad de reward (usa trimestre actual)
      const currentQuarter = getQuarterBounds();
      const currentQuarterlyTotal = computeQuarterlyTotal(orders, currentQuarter.start, currentQuarter.end);

      if (isRewardEligible(currentQuarterlyTotal, currentUser.rewardRedeemed) && !currentUser.rewardAvailable) {
        metaUpdates.push({ key: 'reward_available', value: 'yes' });
      }

      // Actualizar en WooCommerce si hay cambios
      if (metaUpdates.length > 0) {
        await updateCustomer(currentUser.customerId, { meta_data: metaUpdates });

        // Actualizar estado local — re-run resolveRestrictionState to preserve BLOCKED priority
        setUser((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            consultantState: newState,
            rewardAvailable: metaUpdates.some((m) => m.key === 'reward_available') ? true : prev.rewardAvailable,
          };
          updated.restrictionState = resolveRestrictionState(updated);
          updated.isBlocked = updated.restrictionState === CONSULTANT_STATES.BLOCKED;
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

    // Bloquear login si la cuenta esta deshabilitada
    if (buildResult.user.isDisabled) {
      throw new Error('ACCOUNT_DISABLED');
    }

    await persistToken(token);
    setUser(buildResult.user);

    // Evaluar estado trimestral en background para usuarios ACTIVE e INACTIVE
    if (buildResult.user.consultantState === CONSULTANT_STATES.ACTIVE ||
        buildResult.user.consultantState === CONSULTANT_STATES.INACTIVE) {
      evaluateQuarterlyStatus(buildResult.user).catch(() => {});
    }

    return buildResult.user;
  }, [persistToken, evaluateQuarterlyStatus]);

  const logout = useCallback(() => {
    setUser(null);
    persistToken(null);
  }, [persistToken]);

  const refreshUserData = useCallback(async () => {
    if (!user?.token) return;
    try {
      await loadUserFromToken(user.token);
    } catch (e) {
      // Token inválido o error de red
      logout();
    }
  }, [user?.token, loadUserFromToken, logout]);

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
            if (buildResult.success && !buildResult.user.isDisabled) {
              setUser(buildResult.user);
              // Evaluar trimestral en background para usuarios ACTIVE e INACTIVE
              if (buildResult.user.consultantState === CONSULTANT_STATES.ACTIVE ||
                  buildResult.user.consultantState === CONSULTANT_STATES.INACTIVE) {
                evaluateQuarterlyStatus(buildResult.user).catch(() => {});
              }
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
  }, [evaluateQuarterlyStatus, persistToken]);

  const value = {
    user,
    isLoggedIn,
    isLoading,
    login,
    logout,
    refreshUserData,
    isTokenValid,
    evaluateQuarterlyStatus,
  };

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
