import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calcularPrecioFinal } from '../utils/discounts';
import { calculateShipping } from '../utils/shipping';
import { useAuth } from './AuthContext';
import { KIT_PRODUCT_ID, PREMIO_PRODUCT_ID } from '../constants/cartRules';
import { getProductById } from '../api/woocommerce';

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
  const [shippingProvince, setShippingProvince] = useState('');

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

  const shipping = useMemo(
    () => calculateShipping(shippingProvince, totalConDescuento, user?.hasFreeShipping ?? false),
    [shippingProvince, totalConDescuento, user?.hasFreeShipping]
  );
  const shippingCost = shipping.cost;

  // Premio (regalo automático): total sin premio para evaluar threshold
  const hasPremio = useMemo(
    () => cartItems.some((item) => item.product.id === PREMIO_PRODUCT_ID),
    [cartItems]
  );
  const totalSinPremio = useMemo(
    () => cartItems.reduce((sum, item) => {
      if (item.product.id === PREMIO_PRODUCT_ID) return sum;
      const info = calcularPrecioFinal(item.product, user);
      return sum + info.precioFinal * item.quantity;
    }, 0),
    [cartItems, user]
  );
  const premioProductRef = useRef(null);
  const kitProductRef = useRef(null);

  useEffect(() => {
    if (!isRestored || !user) return;
    const shouldHavePremio = user.rewardAvailable === true && user.rewardRedeemed !== true;

    if (shouldHavePremio && !hasPremio) {
      // Auto-add premio
      if (premioProductRef.current) {
        setCartItems((prev) => {
          if (prev.some((i) => i.product.id === PREMIO_PRODUCT_ID)) return prev;
          return [...prev, { product: premioProductRef.current, quantity: 1 }];
        });
      } else {
        getProductById(PREMIO_PRODUCT_ID).then((res) => {
          if (res.success && res.data) {
            const premioProduct = { ...res.data, price: '0', regular_price: '0', sale_price: '0' };
            premioProductRef.current = premioProduct;
            setCartItems((prev) => {
              if (prev.some((i) => i.product.id === PREMIO_PRODUCT_ID)) return prev;
              return [...prev, { product: premioProduct, quantity: 1 }];
            });
          }
        });
      }
    } else if (!shouldHavePremio && hasPremio) {
      // Auto-remove premio
      setCartItems((prev) => prev.filter((i) => i.product.id !== PREMIO_PRODUCT_ID));
    }
  }, [user?.rewardAvailable, user?.rewardRedeemed, hasPremio, isRestored]);

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

  // Pre-load kit product at mount so addToCart can always use the sync path
  useEffect(() => {
    getProductById(KIT_PRODUCT_ID).then((res) => {
      if (res.success && res.data) {
        kitProductRef.current = res.data;
      }
    });
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
      let next = [...prev];
      const idx = next.findIndex((item) => item.product.id === product.id);
      if (idx >= 0) {
        const newQty = Math.min(next[idx].quantity + qty, maxQty);
        if (newQty < 1) return prev;
        next[idx] = { ...next[idx], quantity: newQty };
      } else {
        next = [...next, { product, quantity: qty }];
      }

      // Auto-inyectar kit para consultoras NEW si no esta en el carrito
      if (user?.consultantState === 'new' && !next.some((i) => i.product.id === KIT_PRODUCT_ID)) {
        if (kitProductRef.current) {
          next = [...next, { product: kitProductRef.current, quantity: 1 }];
        } else {
          // Cargar kit product async
          getProductById(KIT_PRODUCT_ID).then((res) => {
            if (res.success && res.data) {
              kitProductRef.current = res.data;
              setCartItems((current) => {
                if (current.some((i) => i.product.id === KIT_PRODUCT_ID)) return current;
                return [...current, { product: res.data, quantity: 1 }];
              });
            }
          });
        }
      }

      return next;
    });
  }, [user?.consultantState]);

  const removeFromCart = useCallback((productId) => {
    // No permitir eliminar el kit para consultoras nuevas
    if (productId === KIT_PRODUCT_ID && user?.consultantState === 'new') return;
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, [user?.consultantState]);

  const updateQuantity = useCallback((productId, newQuantity) => {
    if (newQuantity == null || newQuantity < 1) {
      // No permitir eliminar el kit para consultoras nuevas
      if (productId === KIT_PRODUCT_ID && user?.consultantState === 'new') return;
      removeFromCart(productId);
      return;
    }
    setCartItems((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId);
      if (idx < 0) return prev;
      const item = prev[idx];
      const maxQty = getMaxQuantity(item.product);
      const qty = Math.min(newQuantity, maxQty);
      if (qty < 1) {
        if (productId === KIT_PRODUCT_ID && user?.consultantState === 'new') return prev;
        return prev.filter((_, i) => i !== idx);
      }
      const next = [...prev];
      next[idx] = { ...item, quantity: qty };
      return next;
    });
  }, [removeFromCart, user?.consultantState]);

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
      if (item.quantity <= 1) {
        // No permitir eliminar el kit para consultoras nuevas
        if (productId === KIT_PRODUCT_ID && user?.consultantState === 'new') return prev;
        return prev.filter((_, i) => i !== idx);
      }
      const next = [...prev];
      next[idx] = { ...item, quantity: item.quantity - 1 };
      return next;
    });
  }, [user?.consultantState]);

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
    hasPremio,
    totalSinPremio,
    shippingProvince,
    shippingCost,
    shipping,
    setShippingProvince,
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
