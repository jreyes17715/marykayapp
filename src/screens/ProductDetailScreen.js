import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getProductById, getProductImage, formatPrice, stripHtml } from '../api/woocommerce';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { calcularPrecioFinal } from '../utils/discounts';
import QuantitySelector from '../components/QuantitySelector';
import colors from '../constants/colors';
import theme from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRICE_DISCOUNT = '#d11e51';
const BADGE_NETO = '#777';
const BADGE_ESPECIAL = '#9b59b6';
const BADGE_NIVEL = '#00947e';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_HEIGHT = 350;
const PAD = 16;

function useProductStock(product) {
  if (!product) return { inStock: false, label: 'Agotado', units: 0 };
  const qty = product.stock_quantity;
  const status = (product.stock_status || '').toLowerCase();
  if (status === 'outofstock' || (qty != null && parseInt(qty, 10) <= 0)) {
    return { inStock: false, label: 'Agotado', units: 0 };
  }
  const units = qty != null ? parseInt(qty, 10) : 999;
  return { inStock: true, label: 'Disponible', units };
}

export default function ProductDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addToCart, getItemQuantity, updateQuantity } = useCart();

  const [product, setProduct] = useState(route.params?.product ?? null);
  const [loading, setLoading] = useState(!route.params?.product);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const galleryRef = useRef(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const productId = route.params?.productId ?? product?.id;
  const inCart = getItemQuantity(product?.id ?? 0);
  const displayQty = inCart > 0 ? inCart : quantity;
  const stockInfo = useProductStock(product || null);
  const { inStock, label, units } = stockInfo;
  const maxQty = inStock ? (product?.stock_quantity != null ? Math.min(99, parseInt(product.stock_quantity, 10)) : 99) : 1;

  useEffect(() => {
    if (productId && !route.params?.product) {
      setLoading(true);
      getProductById(productId).then((res) => {
        setLoading(false);
        if (res.success && res.data) {
          setProduct(res.data);
          const currentInCart = getItemQuantity(res.data.id);
          if (currentInCart > 0) setQuantity(currentInCart);
        } else {
          setError(res.error || 'Error al cargar el producto');
        }
      });
    }
  }, [productId]);

  useEffect(() => {
    if (inCart > 0) setQuantity(inCart);
  }, [inCart]);

  const handleAddOrUpdate = useCallback(() => {
    if (!product || !inStock) return;
    if (inCart > 0) {
      updateQuantity(product.id, displayQty);
    } else {
      addToCart(product, quantity);
    }
    setShowToast(true);
    const t = setTimeout(() => setShowToast(false), 2000);
    return () => clearTimeout(t);
  }, [product, inStock, inCart, displayQty, quantity, addToCart, updateQuantity]);

  const handleIncrement = useCallback(() => {
    if (inCart > 0) {
      updateQuantity(product.id, displayQty + 1);
    } else {
      setQuantity((q) => Math.min(maxQty, q + 1));
    }
  }, [inCart, product, displayQty, maxQty, updateQuantity]);

  const handleDecrement = useCallback(() => {
    if (inCart > 0) {
      if (displayQty <= 1) return;
      updateQuantity(product.id, displayQty - 1);
    } else {
      setQuantity((q) => Math.max(1, q - 1));
    }
  }, [inCart, product, displayQty, updateQuantity]);

  if (loading && !product) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !product) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!product) {
    return null;
  }

  const images = product.images && product.images.length > 0
    ? product.images.map((img) => (typeof img === 'string' ? { src: img } : img))
    : [{ src: getProductImage(product) }];
  const hasMultipleImages = images.length > 1;
  const priceInfo = calcularPrecioFinal(product, user);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Galería */}
        <View style={styles.galleryWrap}>
          {hasMultipleImages ? (
            <>
              <ScrollView
                ref={galleryRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                  setGalleryIndex(i);
                }}
                style={styles.galleryScroll}
              >
                {images.map((img, i) => (
                  <Image
                    key={img.id || i}
                    source={{ uri: typeof img === 'object' ? img.src : img }}
                    style={[styles.galleryImage, { width: SCREEN_WIDTH }]}
                    contentFit="contain"
                    placeholder={null}
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                ))}
              </ScrollView>
              <View style={styles.dots}>
                {images.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === galleryIndex && styles.dotActive]}
                  />
                ))}
              </View>
            </>
          ) : (
            <Image
              source={{ uri: typeof images[0] === 'object' ? images[0].src : images[0] }}
              style={styles.galleryImageSingle}
              contentFit="contain"
              placeholder={null}
              transition={200}
              cachePolicy="memory-disk"
            />
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name}>{stripHtml(product.name || '') || 'Producto'}</Text>

          {!user ? (
            <>
              <View style={styles.priceColumn}>
                <Text style={styles.price}>{formatPrice(priceInfo.precioOriginal)}</Text>
              </View>
              <Text style={styles.loginHint}>Inicia sesión para ver tu precio</Text>
            </>
          ) : (
            <>
              {priceInfo.esNeto ? (
                <View style={[styles.discountBadge, { backgroundColor: BADGE_NETO }]}>
                  <Text style={styles.discountText}>🚫 Precio Neto</Text>
                </View>
              ) : priceInfo.origen === 'producto' ? (
                <View style={[styles.discountBadge, { backgroundColor: BADGE_ESPECIAL }]}>
                  <Text style={styles.discountText}>✨ Descuento Especial: {priceInfo.porcentaje}%</Text>
                </View>
              ) : (
                <View style={[styles.discountBadge, { backgroundColor: BADGE_NIVEL }]}>
                  <Text style={styles.discountText}>✅ Aplica {priceInfo.porcentaje}%</Text>
                </View>
              )}
              <View style={styles.priceColumn}>
                {priceInfo.tieneDescuento && !priceInfo.esNeto ? (
                  <>
                    <Text style={styles.regularPrice}>{formatPrice(priceInfo.precioOriginal)}</Text>
                    <Text style={styles.salePrice}>
                      {formatPrice(priceInfo.precioFinal)}
                    </Text>
                    <View style={[styles.discountBadgeSmall, { backgroundColor: PRICE_DISCOUNT }]}>
                      <Text style={styles.discountText}>-{priceInfo.porcentaje}%</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.price}>{formatPrice(priceInfo.precioFinal)}</Text>
                )}
              </View>
              {priceInfo.tieneDescuento && !priceInfo.esNeto && priceInfo.descuento > 0 && (
                <Text style={styles.savingsText}>
                  Ahorras {formatPrice(priceInfo.descuento)}
                </Text>
              )}
            </>
          )}

          <Text style={[styles.stock, inStock ? styles.stockIn : styles.stockOut]}>
            {inStock ? `✓ ${label} (${units} unidades)` : `✗ ${label}`}
          </Text>

          {product.short_description ? (
            <Text style={styles.shortDesc}>{stripHtml(product.short_description)}</Text>
          ) : null}

          <View style={styles.separator} />

          {product.description ? (
            <Text style={styles.description}>{stripHtml(product.description)}</Text>
          ) : null}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Barra fija inferior */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(24, insets.bottom) }]}>
        <QuantitySelector
          value={displayQty}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          min={1}
          max={maxQty}
          size="medium"
        />
        <TouchableOpacity
          style={[styles.addBtn, !inStock && styles.addBtnDisabled]}
          onPress={handleAddOrUpdate}
          disabled={!inStock}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>
            {!inStock ? 'Agotado' : inCart > 0 ? 'Actualizar Carrito' : 'Agregar al Carrito'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Toast */}
      {showToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>¡Agregado al carrito!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  galleryWrap: {
    width: SCREEN_WIDTH,
    height: GALLERY_HEIGHT,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  galleryScroll: {
    height: GALLERY_HEIGHT,
  },
  galleryImage: {
    height: GALLERY_HEIGHT,
  },
  galleryImageSingle: {
    width: SCREEN_WIDTH,
    height: GALLERY_HEIGHT,
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  info: {
    paddingHorizontal: PAD,
    paddingTop: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 12,
  },
  priceRow: {
    marginBottom: 8,
  },
  priceColumn: {
    flexDirection: 'column',
    marginBottom: 8,
  },
  regularPrice: {
    fontSize: 16,
    color: colors.gray,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  salePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  loginHint: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 8,
  },
  discountBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  discountBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  savingsText: {
    fontSize: 15,
    color: colors.success,
    fontWeight: '600',
    marginBottom: 8,
  },
  stock: {
    fontSize: 14,
    marginBottom: 12,
  },
  stockIn: {
    color: colors.success,
  },
  stockOut: {
    color: colors.primary,
  },
  shortDesc: {
    fontSize: 14,
    color: colors.darkGray,
    lineHeight: 20,
    marginBottom: 16,
  },
  separator: {
    height: 1,
    backgroundColor: colors.lightGray,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: colors.gray,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.button,
    marginLeft: 16,
  },
  addBtnDisabled: {
    backgroundColor: colors.gray,
  },
  addBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  toast: {
    position: 'absolute',
    bottom: 120,
    left: PAD,
    right: PAD,
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.button,
    alignItems: 'center',
  },
  toastText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
