import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getProductImage, formatPrice, stripHtml } from '../api/woocommerce';
import { calcularPrecioFinal } from '../utils/discounts';
import colors from '../constants/colors';
import theme from '../constants/theme';

const PRICE_DISCOUNT = '#d11e51';
const BADGE_NETO = '#777';
const BADGE_ESPECIAL = '#9b59b6';
const BADGE_NIVEL = '#00947e';

function useProductStock(product) {
  if (!product) return { inStock: false, label: 'Agotado', labelColor: colors.primary };
  const qty = product.stock_quantity;
  const status = (product.stock_status || '').toLowerCase();
  if (status === 'outofstock' || (qty != null && parseInt(qty, 10) <= 0)) {
    return { inStock: false, label: 'Agotado', labelColor: colors.primary };
  }
  return { inStock: true, label: 'En stock', labelColor: colors.success };
}

function ProductCard({ product, onPress }) {
  const { user } = useAuth();
  const { addToCart, getItemQuantity, incrementQuantity, decrementQuantity } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const quantity = getItemQuantity(product.id);

  const imageUri = getProductImage(product);
  const priceInfo = calcularPrecioFinal(product, user);

  const { inStock, label, labelColor } = useProductStock(product);

  const handleAddToCart = () => {
    if (!inStock) return;
    addToCart(product, 1);
    setJustAdded(true);
    const t = setTimeout(() => setJustAdded(false), 400);
    return () => clearTimeout(t);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.imageWrap}
        onPress={() => onPress && onPress(product)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          contentFit="cover"
          placeholder={null}
          transition={200}
          cachePolicy="memory-disk"
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.nameWrap}
        onPress={() => onPress && onPress(product)}
        activeOpacity={0.7}
      >
        <Text style={styles.name} numberOfLines={2}>
          {stripHtml(product.name || '') || 'Producto'}
        </Text>
      </TouchableOpacity>

      {!user ? (
        <>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {formatPrice(priceInfo.precioOriginal)}
            </Text>
          </View>
          <Text style={styles.loginHint}>Inicia sesión para ver tu precio</Text>
        </>
      ) : (
        <>
          {priceInfo.esNeto ? (
            <View style={styles.badgeWrap}>
              <View style={[styles.badge, { backgroundColor: BADGE_NETO }]}>
                <Text style={styles.badgeText}>🚫 Precio Neto</Text>
              </View>
            </View>
          ) : priceInfo.origen === 'producto' ? (
            <View style={styles.badgeWrap}>
              <View style={[styles.badge, { backgroundColor: BADGE_ESPECIAL }]}>
                <Text style={styles.badgeText}>✨ Descuento Especial: {priceInfo.porcentaje}%</Text>
              </View>
            </View>
          ) : (
            <View style={styles.badgeWrap}>
              <View style={[styles.badge, { backgroundColor: BADGE_NIVEL }]}>
                <Text style={styles.badgeText}>✅ Aplica {priceInfo.porcentaje}%</Text>
              </View>
            </View>
          )}
          <View style={styles.priceColumn}>
            {priceInfo.tieneDescuento && !priceInfo.esNeto ? (
              <>
                <Text style={styles.regularPriceStrikethrough}>
                  {formatPrice(priceInfo.precioOriginal)}
                </Text>
                <Text style={styles.salePrice}>
                  {formatPrice(priceInfo.precioFinal)}
                </Text>
              </>
            ) : (
              <Text style={styles.price}>
                {formatPrice(priceInfo.precioFinal)}
              </Text>
            )}
          </View>
        </>
      )}

      <Text style={[styles.stock, { color: labelColor }]}>{label}</Text>

      {quantity > 0 ? (
        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => decrementQuantity(product.id)}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => inStock && incrementQuantity(product.id)}
            disabled={!inStock}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.addBtn,
            !inStock && styles.addBtnDisabled,
            justAdded && styles.addBtnFeedback,
          ]}
          onPress={handleAddToCart}
          disabled={!inStock}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>Agregar al carrito</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default React.memo(ProductCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: theme.borderRadius.card,
    padding: 10,
    marginBottom: 16,
    ...theme.shadow,
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.borderRadius.button,
    overflow: 'hidden',
    backgroundColor: colors.lightGray,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  nameWrap: {
    marginTop: 8,
  },
  name: {
    fontSize: 14,
    color: colors.darkGray,
    fontWeight: '500',
  },
  priceRow: {
    marginTop: 4,
  },
  priceColumn: {
    flexDirection: 'column',
    marginTop: 4,
  },
  regularPriceStrikethrough: {
    fontSize: 12,
    color: colors.gray,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  salePrice: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: 'bold',
  },
  price: {
    fontSize: 15,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  loginHint: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 2,
  },
  badgeWrap: {
    marginTop: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  stock: {
    fontSize: 12,
    marginTop: 4,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: theme.borderRadius.button,
    paddingVertical: 12,
    marginTop: 10,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: colors.gray,
  },
  addBtnFeedback: {
    opacity: 0.85,
    backgroundColor: '#a01842',
  },
  addBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 12,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 24,
    textAlign: 'center',
  },
});
