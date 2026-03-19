import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loginUser,
  validateToken,
  getCurrentWPUser,
  findCustomerByEmail,
} from '../api/woocommerce';
import { getUserMeta } from '../utils/helpers';

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
    const user = {
      id: wpUser.id,
      customerId: customer.id,
      email: customer.email || email,
      displayName:
        customer.first_name && customer.last_name
          ? `${customer.first_name} ${customer.last_name}`.trim()
          : (wpUser.name || wpUser.user_display_name || customer.username || email),
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
    };
    return { success: true, user };
  }

  // Sin customer en WooCommerce: entrar con datos básicos del JWT/WP
  const displayName =
    wpUser.name || wpUser.user_display_name || wpUser.nicename || email || 'Usuario';
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

  const login = useCallback(async (username, password) => {
    const result = await loginUser(username, password);
    if (!result.success) {
      throw new Error(result.error || 'Credenciales incorrectas');
    }
    const { token, user_email } = result.data;
    await persistToken(token);
    const userData = await loadUserFromToken(token, user_email);
    return userData;
  }, [loadUserFromToken, persistToken]);

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
            await loadUserFromToken(token);
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
  }, [loadUserFromToken, persistToken]);

  const value = {
    user,
    isLoggedIn,
    isLoading,
    login,
    logout,
    refreshUserData,
    isTokenValid,
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
