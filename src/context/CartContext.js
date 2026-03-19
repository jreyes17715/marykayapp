import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calcularPrecioFinal } from '../utils/discounts';
import { useAuth } from './AuthContext';

const CART_STORAGE_KEY = '@marykay_cart';

export const CartContext = createContext({});

function getMaxQuantity(product) {
  if (!product) return 999;
  if (product.manage_stock && product.stock_quantity != null) {
    return Math.max(0, parseInt(product.stock_quantity, 10));
  }
  return 999;
}

/**
 * Calcula totales y desglose de descuentos del carrito.
 * @param {Array} items - [{ product, quantity }]
 * @param {Object|null} user - Usuario logueado
 */
function computeCartTotals(items, user) {
  let totalItems = 0;
  let subtotalOriginal = 0;
  let totalConDescuento = 0;
  const nivelByPct = {}; // { [porcentaje]: monto }
  const especialByPct = {}; // { [porcentaje]: monto }
  let totalNetos = 0;

  items.forEach(({ product, quantity }) => {
    totalItems += quantity;
    const priceInfo = calcularPrecioFinal(product, user);
    const lineOriginal = priceInfo.precioOriginal * quantity;
    const lineFinal = priceInfo.precioFinal * quantity;
    subtotalOriginal += lineOriginal;
    totalConDescuento += lineFinal;

    if (priceInfo.esNeto) {
      totalNetos += lineFinal;
    } else if (priceInfo.origen === 'usuario') {
      const pct = priceInfo.porcentaje;
      nivelByPct[pct] = (nivelByPct[pct] || 0) + (lineOriginal - lineFinal);
    } else if (priceInfo.origen === 'producto') {
      const pct = priceInfo.porcentaje;
      especialByPct[pct] = (especialByPct[pct] || 0) + (lineOriginal - lineFinal);
    }
  });

  const discountNivel =
    Object.keys(nivelByPct).length > 0
      ? Object.entries(nivelByPct).map(([pct, monto]) => ({ porcentaje: Number(pct), monto }))[0]
      : null;
  const discountEspeciales = Object.entries(especialByPct).map(([pct, monto]) => ({
    porcentaje: Number(pct),
    monto,
  }));

  return {
    totalItems,
    subtotalOriginal,
    totalConDescuento,
    discountNivel,
    discountEspeciales,
    totalNetos,
  };
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [isRestored, setIsRestored] = useState(false);

  const {
    totalItems,
    subtotalOriginal,
    totalConDescuento,
    discountNivel,
    discountEspeciales,
    totalNetos,
  } = useMemo(
    () => computeCartTotals(cartItems, user),
    [cartItems, user]
  );

  const totalPrice = totalConDescuento;

  const persistCart = useCallback(async (items) => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) setCartItems(parsed);
          } catch (e) {
            // ignore
          }
        }
        setIsRestored(true);
      })
      .catch(() => setIsRestored(true));
  }, []);

  useEffect(() => {
    if (!isRestored) return;
    persistCart(cartItems);
  }, [cartItems, isRestored, persistCart]);

  const addToCart = useCallback((product, quantity = 1) => {
    if (!product || quantity < 1) return;
    const maxQty = getMaxQuantity(product);
    const qty = Math.min(quantity, maxQty);
    if (qty < 1) return;

    setCartItems((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        const newQty = Math.min(prev[idx].quantity + qty, maxQty);
        if (newQty < 1) return prev;
        next[idx] = { ...next[idx], quantity: newQty };
        return next;
      }
      return [...prev, { product, quantity: qty }];
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, newQuantity) => {
    if (newQuantity == null || newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId);
      if (idx < 0) return prev;
      const item = prev[idx];
      const maxQty = getMaxQuantity(item.product);
      const qty = Math.min(newQuantity, maxQty);
      if (qty < 1) return prev.filter((_, i) => i !== idx);
      const next = [...prev];
      next[idx] = { ...item, quantity: qty };
      return next;
    });
  }, [removeFromCart]);

  const incrementQuantity = useCallback((productId) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId);
      if (idx < 0) return prev;
      const item = prev[idx];
      const maxQty = getMaxQuantity(item.product);
      if (item.quantity >= maxQty) return prev;
      const next = [...prev];
      next[idx] = { ...item, quantity: item.quantity + 1 };
      return next;
    });
  }, []);

  const decrementQuantity = useCallback((productId) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId);
      if (idx < 0) return prev;
      const item = prev[idx];
      if (item.quantity <= 1) return prev.filter((_, i) => i !== idx);
      const next = [...prev];
      next[idx] = { ...item, quantity: item.quantity - 1 };
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const getItemQuantity = useCallback((productId) => {
    const item = cartItems.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  }, [cartItems]);

  const value = {
    cartItems,
    totalItems,
    totalPrice,
    subtotalOriginal,
    totalConDescuento,
    discountNivel,
    discountEspeciales,
    totalNetos,
    addToCart,
    removeFromCart,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    clearCart,
    getItemQuantity,
    isRestored,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
