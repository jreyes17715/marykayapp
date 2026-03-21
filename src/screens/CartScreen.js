import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  LayoutAnimation,
  UIManager,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getProductImage, formatPrice, stripHtml, getProductById } from '../api/woocommerce';
import {
  FLAI_BYPASS,
  checkAvailability,
  createReservation,
  cartItemsToFlaiProducts,
  getInsufficientStock,
} from '../api/flai';
import { calcularPrecioFinal } from '../utils/discounts';
import { validarCarrito, getValidationMessage, getMinRequiredForUser } from '../utils/cartValidation';
import { KIT_PRODUCT_ID, PREMIO_PRODUCT_ID } from '../constants/cartRules';
import QuantitySelector from '../components/QuantitySelector';
import colors from '../constants/colors';
import theme from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const FLAI_TIMEOUT_MS = 15000;

const BANNER_BG = '#FFF3CD';
const BANNER_BORDER = '#FFC107';
const BANNER_TEXT = '#856404';
const PROGRESS_BG = '#E0E0E0';
const PROGRESS_FILL = '#d11e51';
const PROGRESS_OK = '#4CAF50';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CartScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    cartItems,
    totalItems,
    subtotalOriginal,
    totalConDescuento,
    discountNivel,
    discountEspeciales,
    totalNetos,
    hasPremio,
    totalSinPremio,
    addToCart,
    incrementQuantity,
    decrementQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const [addingKit, setAddingKit] = useState(false);
  const [checkingFlai, setCheckingFlai] = useState(false);
  const [stockErrorMsg, setStockErrorMsg] = useState(null);
  const timeoutRef = useRef(null);

  const premioTotal = useMemo(
    () => cartItems.reduce((sum, item) => item.product.id === PREMIO_PRODUCT_ID ? sum : 0, 0),
    [cartItems]
  );
  const validation = useMemo(
    () => validarCarrito(cartItems, user, totalConDescuento, totalConDescuento - totalSinPremio),
    [cartItems, user, totalConDescuento, totalSinPremio]
  );
  const isValid = validation.valid;
  const validationMessage = getValidationMessage(validation);
  const minRequired = validation.minRequired ?? getMinRequiredForUser(user);
  const showProgress = user && minRequired != null && minRequired > 0 && cartItems.length > 0;
  const progressPct = showProgress
    ? Math.min(100, (totalConDescuento / minRequired) * 100)
    : 100;
  const progressReached = showProgress && totalConDescuento >= minRequired;

  const handleClearCart = useCallback(() => {
    if (cartItems.length === 0) return;
    Alert.alert(
      'Vaciar carrito',
      '¿Estás segura de que deseas vaciar todo el carrito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Vaciar', style: 'destructive', onPress: () => clearCart() },
      ]
    );
  }, [cartItems.length, clearCart]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleClearCart}
          disabled={cartItems.length === 0}
          style={styles.headerButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text
            style={[
              styles.headerButtonText,
              cartItems.length === 0 && styles.headerButtonTextDisabled,
            ]}
          >
            Vaciar carrito
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleClearCart, cartItems.length]);

  const handleRemoveItem = useCallback((productId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    removeFromCart(productId);
  }, [removeFromCart]);

  const handleCheckout = useCallback(async () => {
    if (cartItems.length === 0 || !isValid) return;
    const flaiProducts = cartItemsToFlaiProducts(cartItems);

    if (FLAI_BYPASS) {
      navigation.navigate('Checkout');
      return;
    }

    if (flaiProducts.length === 0) {
      navigation.navigate('Checkout');
      return;
    }

    setCheckingFlai(true);
    const timeoutPromise = new Promise((_, reject) => {
      timeoutRef.current = setTimeout(
        () => reject(new Error('TIMEOUT')),
        FLAI_TIMEOUT_MS
      );
    });

    const runFlai = async () => {
      const avail = await checkAvailability(flaiProducts);
      if (!avail.success) throw new Error(avail.error || 'Error FLAI');
      const insufficient = getInsufficientStock(flaiProducts, avail.products);
      if (insufficient.length > 0) {
        const lines = insufficient.map(
          (i) => `• ${i.product_name || i.default_code}: pides ${i.requested}, disponible ${i.available}`
        );
        throw new Error('STOCK_INSUFFICIENT:' + lines.join('\n'));
      }
      const userData = {
        fullName: user?.displayName || '',
        phone: user?.billing?.phone || '',
        address: user?.billing?.address_1 || '',
      };
      const res = await createReservation(flaiProducts, userData);
      if (!res.success) throw new Error(res.error || 'Error al crear reserva');
      return res.orderId;
    };

    try {
      const orderId = await Promise.race([runFlai(), timeoutPromise]);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setCheckingFlai(false);
      navigation.navigate('Checkout', { reserveId: orderId });
    } catch (err) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setCheckingFlai(false);
      const msg = err?.message || '';
      if (msg === 'TIMEOUT') {
        Alert.alert(
          'Tiempo agotado',
          'No pudimos verificar la disponibilidad. Intenta de nuevo.'
        );
        return;
      }
      if (msg.startsWith('STOCK_INSUFFICIENT:')) {
        const text = msg.replace('STOCK_INSUFFICIENT:', '').trim();
        setStockErrorMsg(text);
        return;
      }
      Alert.alert(
        'Error',
        msg || 'No pudimos verificar la disponibilidad. Intenta de nuevo.'
      );
    }
  }, [navigation, cartItems.length, isValid, cartItems, user]);

  const handleAddKit = useCallback(async () => {
    if (addingKit) return;
    setAddingKit(true);
    try {
      const res = await getProductById(KIT_PRODUCT_ID);
      if (res.success && res.data) {
        addToCart(res.data, 1);
      } else {
        Alert.alert('Error', 'No se pudo cargar el Kit Inicial. Intenta de nuevo.');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo agregar el Kit Inicial.');
    } finally {
      setAddingKit(false);
    }
  }, [addingKit, addToCart]);

  const getMaxQty = useCallback((product) => {
    if (!product) return 99;
    if (product.manage_stock && product.stock_quantity != null) {
      return Math.min(99, Math.max(0, parseInt(product.stock_quantity, 10)));
    }
    return 99;
  }, []);

  const renderItem = useCallback(
    ({ item }) => {
      const { product, quantity } = item;
      const isPremio = product.id === PREMIO_PRODUCT_ID;
      const priceInfo = calcularPrecioFinal(product, user);
      const lineTotal = isPremio ? 0 : priceInfo.precioFinal * quantity;
      const maxQty = getMaxQty(product);
      const showDiscount = user && priceInfo.tieneDescuento && !priceInfo.esNeto && !isPremio;

      return (
        <View style={styles.itemCard}>
          {!isPremio && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleRemoveItem(product.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          )}
          {isPremio && (
            <View style={styles.premioBadge}>
              <Text style={styles.premioBadgeText}>Regalo</Text>
            </View>
          )}
          <View style={styles.itemRow}>
            <Image
              source={{ uri: getProductImage(product) }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {stripHtml(product.name || '') || 'Producto'}
              </Text>
              <View style={styles.unitPriceRow}>
                {isPremio ? (
                  <Text style={styles.unitPriceFree}>Gratis</Text>
                ) : showDiscount ? (
                  <>
                    <Text style={styles.unitPriceStrike}>
                      {formatPrice(priceInfo.precioOriginal)}
                    </Text>
                    <Text style={styles.unitPriceSale}>
                      {formatPrice(priceInfo.precioFinal)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.unitPrice}>
                    {formatPrice(priceInfo.precioFinal)}
                  </Text>
                )}
              </View>
              {!isPremio && (
                <View style={styles.quantityRow}>
                  <QuantitySelector
                    value={quantity}
                    onIncrement={() => incrementQuantity(product.id)}
                    onDecrement={() => decrementQuantity(product.id)}
                    min={1}
                    max={maxQty}
                    size="small"
                  />
                </View>
              )}
              <Text style={styles.subtotal}>
                {isPremio ? 'RD$ 0.00' : formatPrice(lineTotal.toFixed(2))}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [user, handleRemoveItem, getMaxQty, incrementQuantity, decrementQuantity]
  );

  const keyExtractor = useCallback((item, index) => `${item.product.id}-${index}`, []);

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Feather name="shopping-cart" size={72} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
        <Text style={styles.emptySubtitle}>Agrega productos para comenzar</Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => navigation.navigate('Tienda')}
          activeOpacity={0.8}
        >
          <Text style={styles.shopButtonText}>Ir a la tienda</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Modal
        visible={checkingFlai}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.flaiOverlay}>
          <View style={styles.flaiModal}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.flaiModalText}>Verificando disponibilidad...</Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!stockErrorMsg}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setStockErrorMsg(null)}
      >
        <TouchableOpacity
          style={styles.stockErrorOverlay}
          activeOpacity={1}
          onPress={() => setStockErrorMsg(null)}
        >
          <TouchableOpacity
            style={styles.stockErrorCard}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Feather name="alert-triangle" size={32} color="#B71C1C" style={styles.stockErrorIcon} />
            <Text style={styles.stockErrorTitle}>Stock insuficiente</Text>
            <Text style={styles.stockErrorText}>{stockErrorMsg}</Text>
            <Text style={styles.stockErrorHint}>Ajusta las cantidades en tu carrito.</Text>
            <TouchableOpacity
              style={styles.stockErrorBtn}
              onPress={() => setStockErrorMsg(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.stockErrorBtnText}>Entendido</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {!isValid && validationMessage ? (
        <View style={styles.validationBanner}>
          <Text style={styles.validationBannerText}>{validationMessage}</Text>
          {validation.type === 'missing_kit' && (
            <TouchableOpacity
              style={styles.addKitBtn}
              onPress={handleAddKit}
              disabled={addingKit}
              activeOpacity={0.8}
            >
              {addingKit ? (
                <ActivityIndicator size="small" color={BANNER_TEXT} />
              ) : (
                <Text style={styles.addKitBtnText}>Agregar Kit Inicial</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      <FlatList
        data={cartItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.listContent, { paddingBottom: 280 }]}
        showsVerticalScrollIndicator={false}
      />

      {showProgress && (
        <View style={styles.progressWrap}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressPct}%`,
                  backgroundColor: progressReached ? PROGRESS_OK : PROGRESS_FILL,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progressReached
              ? '✓ Mínimo alcanzado'
              : `RD$ ${totalConDescuento.toLocaleString('es-DO', { minimumFractionDigits: 2 })} de RD$ ${minRequired.toLocaleString('es-DO')} mínimo`}
          </Text>
        </View>
      )}

      <View style={[styles.fixedBottom, { paddingBottom: Math.max(24, insets.bottom) }]}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              {formatPrice(subtotalOriginal.toFixed(2))}
            </Text>
          </View>
          {user && discountNivel && discountNivel.monto > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Descuento consultora ({discountNivel.porcentaje}%)
              </Text>
              <Text style={styles.discountValue}>
                -{formatPrice(discountNivel.monto.toFixed(2))}
              </Text>
            </View>
          )}
          {user &&
            discountEspeciales.map((d, idx) => (
              <View key={`especial-${d.porcentaje}-${idx}`} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Descuento especial ({d.porcentaje}%)
                </Text>
                <Text style={styles.discountValue}>
                  -{formatPrice(d.monto.toFixed(2))}
                </Text>
              </View>
            ))}
          {user && totalNetos > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Productos a precio neto</Text>
              <Text style={styles.summaryValue}>
                {formatPrice(totalNetos.toFixed(2))}
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Envío</Text>
            <Text style={styles.shippingPlaceholder}>Por calcular</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total con descuentos</Text>
            <Text style={styles.totalValue}>
              {formatPrice(totalConDescuento.toFixed(2))}
            </Text>
          </View>
          <Text style={styles.itemCount}>
            {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, !isValid && styles.checkoutBtnDisabled]}
          onPress={handleCheckout}
          disabled={!isValid}
          activeOpacity={0.8}
        >
          <Text style={styles.checkoutBtnText}>
            Proceder al Pago ({totalItems} {totalItems === 1 ? 'item' : 'items'})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  headerButtonTextDisabled: {
    color: colors.gray,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  validationBanner: {
    backgroundColor: BANNER_BG,
    borderLeftWidth: 4,
    borderLeftColor: BANNER_BORDER,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 4,
  },
  validationBannerText: {
    fontSize: 14,
    color: BANNER_TEXT,
    marginBottom: 8,
  },
  addKitBtn: {
    alignSelf: 'flex-start',
    backgroundColor: BANNER_BORDER,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.button,
    minHeight: 36,
    justifyContent: 'center',
  },
  addKitBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: BANNER_TEXT,
  },
  progressWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 200,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: PROGRESS_BG,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.darkGray,
    marginTop: 4,
  },
  checkoutBtnDisabled: {
    opacity: 0.6,
  },
  flaiOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flaiModal: {
    backgroundColor: colors.white,
    borderRadius: theme.borderRadius.card,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
  },
  flaiModalText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.darkGray,
  },
  stockErrorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  stockErrorCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: theme.borderRadius.card,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
    width: '100%',
    maxWidth: 340,
  },
  stockErrorIcon: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
  },
  stockErrorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B71C1C',
    textAlign: 'center',
    marginBottom: 12,
  },
  stockErrorText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 8,
    lineHeight: 20,
  },
  stockErrorHint: {
    fontSize: 13,
    color: colors.darkGray,
    marginBottom: 16,
  },
  stockErrorBtn: {
    backgroundColor: '#D32F2F',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.button,
    alignItems: 'center',
  },
  stockErrorBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: theme.borderRadius.card,
    padding: 12,
    marginBottom: 12,
    ...theme.shadow,
  },
  deleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 14,
    color: colors.darkGray,
    fontWeight: 'bold',
  },
  premioBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premioBadgeText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: 'bold',
  },
  unitPriceFree: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.button,
    backgroundColor: colors.lightGray,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 4,
  },
  unitPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  unitPriceStrike: {
    fontSize: 13,
    color: colors.gray,
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  unitPriceSale: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  unitPrice: {
    fontSize: 14,
    color: colors.darkGray,
    fontWeight: '600',
  },
  quantityRow: {
    marginBottom: 6,
  },
  subtotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  fixedBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  summaryCard: {
    backgroundColor: colors.lightGray,
    borderRadius: theme.borderRadius.card,
    padding: 16,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.darkGray,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: '600',
  },
  shippingPlaceholder: {
    fontSize: 14,
    color: colors.gray,
  },
  discountValue: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray,
    marginVertical: 12,
    opacity: 0.5,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
  },
  itemCount: {
    fontSize: 13,
    color: colors.gray,
    marginTop: 4,
  },
  checkoutBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.button,
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconWrap: {
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 80,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.gray,
    marginBottom: 32,
    textAlign: 'center',
  },
  shopButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: theme.borderRadius.button,
  },
  shopButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
