import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder, getProductImage, formatPrice, stripHtml } from '../api/woocommerce';
import { getProductPrice } from '../utils/helpers';
import { validarCarrito, getValidationMessage } from '../utils/cartValidation';
import colors from '../constants/colors';
import theme from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COUNTRY_CODE = 'DO';
const COUNTRY_LABEL = 'República Dominicana';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(form) {
  const err = {};
  if (!form.firstName?.trim()) err.firstName = 'El nombre es requerido';
  if (!form.lastName?.trim()) err.lastName = 'El apellido es requerido';
  if (!form.email?.trim()) err.email = 'El correo es requerido';
  else if (!emailRegex.test(form.email.trim())) err.email = 'Correo no válido';
  if (!form.phone?.trim()) err.phone = 'El teléfono es requerido';
  else if (form.phone.replace(/\D/g, '').length < 8) err.phone = 'Mínimo 8 dígitos';
  if (!form.address?.trim()) err.address = 'La dirección es requerida';
  if (!form.city?.trim()) err.city = 'La ciudad es requerida';
  return err;
}

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
};

function formFromUser(user) {
  if (!user) return initialForm;
  const b = user.billing || {};
  const firstName = b.first_name || user.firstName || '';
  const lastName = b.last_name || user.lastName || '';
  const email = b.email || user.email || '';
  const phone = b.phone || '';
  const address = b.address_1 || '';
  const city = b.city || '';
  const state = b.state || '';
  return {
    firstName: typeof firstName === 'string' ? firstName : '',
    lastName: typeof lastName === 'string' ? lastName : '',
    email: typeof email === 'string' ? email : '',
    phone: typeof phone === 'string' ? phone : '',
    address: typeof address === 'string' ? address : '',
    city: typeof city === 'string' ? city : '',
    state: typeof state === 'string' ? state : '',
  };
}

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user, refreshUserData } = useAuth();
  const {
    cartItems,
    totalPrice,
    totalConDescuento,
    subtotalOriginal,
    discountNivel,
    discountEspeciales,
    totalNetos,
    clearCart,
  } = useCart();
  const reserveId = route.params?.reserveId ?? null;

  const [orderSummaryExpanded, setOrderSummaryExpanded] = useState(true);
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(initialForm);
  const [formPreFilled, setFormPreFilled] = useState(false);

  useEffect(() => {
    if (user && !formPreFilled) {
      setForm(formFromUser(user));
      setFormPreFilled(true);
    }
  }, [user, formPreFilled]);

  const updateForm = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  useFocusEffect(
    useCallback(() => {
      const total = totalConDescuento ?? totalPrice ?? 0;
      const validation = validarCarrito(cartItems, user, total);
      if (!validation.valid) {
        const msg = getValidationMessage(validation);
        navigation.goBack();
        setTimeout(() => {
          Alert.alert('Carrito no válido', msg || 'Tu carrito no cumple los requisitos mínimos. Revisa el carrito.');
        }, 400);
      }
    }, [cartItems, user, totalConDescuento, totalPrice, navigation])
  );

  const totalDiscount = Math.max(
    0,
    (subtotalOriginal ?? 0) - (totalConDescuento ?? totalPrice ?? 0)
  );

  const buildOrderPayload = useCallback(() => {
    const billing = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      address_1: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      country: COUNTRY_CODE,
      email: form.email.trim(),
      phone: form.phone.trim(),
    };
    const shipping = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      address_1: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      country: COUNTRY_CODE,
    };
    const line_items = cartItems.map(({ product, quantity }) => ({
      product_id: product.id,
      quantity,
    }));
    const payload = {
      customer_id: user?.customerId ?? 0,
      payment_method: 'bacs',
      payment_method_title: 'Transferencia bancaria',
      set_paid: false,
      billing,
      shipping,
      line_items,
    };
    if (totalDiscount > 0) {
      payload.fee_lines = [
        {
          name: 'Descuento consultoras - Descuento Total',
          total: `-${totalDiscount.toFixed(2)}`,
        },
      ];
    }
    if (reserveId != null && reserveId !== '') {
      payload.meta_data = [
        { key: '_cel_external_order_id', value: String(reserveId) },
      ];
    }
    return payload;
  }, [form, cartItems, reserveId, user?.customerId, totalDiscount]);

  const handleConfirm = useCallback(async () => {
    if (cartItems.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos antes de confirmar.');
      return;
    }
    const err = validateForm(form);
    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }
    const total = totalConDescuento ?? totalPrice ?? 0;
    const validation = validarCarrito(cartItems, user, total);
    if (!validation.valid) {
      Alert.alert(
        'Carrito no válido',
        getValidationMessage(validation) || 'Tu carrito no cumple los requisitos. Vuelve al carrito.'
      );
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const payload = buildOrderPayload();
      const res = await createOrder(payload);
      setLoading(false);
      if (res.success && res.data) {
        clearCart();
        setOrderId(res.data.id != null ? res.data.id : '');
        setSuccess(true);
        refreshUserData?.();
      } else {
        Alert.alert(
          'Error al crear el pedido',
          res.error || 'No se pudo crear la orden. Intenta de nuevo.'
        );
      }
    } catch (e) {
      setLoading(false);
      Alert.alert(
        'Error',
        e?.message || 'No se pudo crear la orden. Intenta de nuevo.'
      );
    }
  }, [
    form,
    cartItems,
    user,
    totalConDescuento,
    totalPrice,
    buildOrderPayload,
    clearCart,
    refreshUserData,
  ]);

  const goHome = useCallback(() => {
    navigation.navigate('Inicio', { screen: 'Home' });
  }, [navigation]);

  if (cartItems.length === 0 && !success) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Tu carrito está vacío</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Volver al carrito</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconWrap}>
          <Text style={styles.successIcon}>✓</Text>
        </View>
        <Text style={styles.successTitle}>¡Pedido Confirmado!</Text>
        <Text style={styles.successSubtitle}>
          Tu orden #{orderId} ha sido creada exitosamente
        </Text>
        <Text style={styles.successNote}>Recibirás un correo de confirmación</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={goHome} activeOpacity={0.8}>
          <Text style={styles.primaryBtnText}>Volver al Inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalFormatted = formatPrice((totalConDescuento ?? totalPrice ?? 0).toFixed(2));
  const subtotalFormatted = formatPrice((subtotalOriginal ?? 0).toFixed(2));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Sección 1: Resumen del pedido (colapsable) */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setOrderSummaryExpanded((e) => !e)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>Resumen del Pedido</Text>
          <Text style={styles.expandIcon}>{orderSummaryExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        {orderSummaryExpanded && (
          <View style={styles.summaryCard}>
            {cartItems.map(({ product, quantity }, index) => (
              <View key={`order-${product.id}-${index}`} style={styles.summaryRow}>
                <Image
                  source={{ uri: getProductImage(product) }}
                  style={styles.summaryThumb}
                  resizeMode="cover"
                />
                <View style={styles.summaryInfo}>
                  <Text style={styles.summaryName} numberOfLines={2}>{stripHtml(product.name || '') || 'Producto'}</Text>
                  <Text style={styles.summaryQty}>Cantidad: {quantity}</Text>
                  <Text style={styles.summaryPrice}>
                    {formatPrice((getProductPrice(product) * quantity).toFixed(2))}
                  </Text>
                </View>
              </View>
            ))}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLineLabel}>Subtotal (precios originales)</Text>
              <Text style={styles.summaryLineValue}>{subtotalFormatted}</Text>
            </View>
            {user && discountNivel && discountNivel.monto > 0 && (
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLineLabel}>
                  Descuento consultora ({discountNivel.porcentaje}%)
                </Text>
                <Text style={styles.summaryDiscountValue}>
                  -{formatPrice(discountNivel.monto.toFixed(2))}
                </Text>
              </View>
            )}
            {user &&
              discountEspeciales &&
              discountEspeciales.map((d, idx) => (
                <View key={`especial-${d.porcentaje}-${idx}`} style={styles.summaryLine}>
                  <Text style={styles.summaryLineLabel}>
                    Descuento especial ({d.porcentaje}%)
                  </Text>
                  <Text style={styles.summaryDiscountValue}>
                    -{formatPrice(d.monto.toFixed(2))}
                  </Text>
                </View>
              ))}
            {user && totalNetos > 0 && (
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLineLabel}>Productos a precio neto</Text>
                <Text style={styles.summaryLineValue}>
                  {formatPrice(totalNetos.toFixed(2))}
                </Text>
              </View>
            )}
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLineLabel}>Envío</Text>
              <Text style={styles.summaryLineValueMuted}>Por calcular</Text>
            </View>
            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>{totalFormatted}</Text>
            </View>
          </View>
        )}

        {/* Sección 2: Datos del cliente */}
        <Text style={styles.sectionTitle}>Datos del Cliente</Text>
        <View style={styles.card}>
          <Text style={[styles.label, styles.labelFirst]}>Nombre *</Text>
          <TextInput
            style={[styles.input, errors.firstName && styles.inputError]}
            value={form.firstName}
            onChangeText={(v) => updateForm('firstName', v)}
            placeholder="Tu nombre"
            placeholderTextColor={colors.gray}
            autoCapitalize="words"
          />
          {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}

          <Text style={styles.label}>Apellido *</Text>
          <TextInput
            style={[styles.input, errors.lastName && styles.inputError]}
            value={form.lastName}
            onChangeText={(v) => updateForm('lastName', v)}
            placeholder="Tu apellido"
            placeholderTextColor={colors.gray}
            autoCapitalize="words"
          />
          {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            value={form.email}
            onChangeText={(v) => updateForm('email', v)}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={colors.gray}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

          <Text style={styles.label}>Teléfono *</Text>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            value={form.phone}
            onChangeText={(v) => updateForm('phone', v)}
            placeholder="8 dígitos mínimo"
            placeholderTextColor={colors.gray}
            keyboardType="phone-pad"
          />
          {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
        </View>

        {/* Sección 3: Dirección de envío */}
        <Text style={styles.sectionTitle}>Dirección de Envío</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Dirección *</Text>
          <TextInput
            style={[styles.input, errors.address && styles.inputError]}
            value={form.address}
            onChangeText={(v) => updateForm('address', v)}
            placeholder="Calle, número, zona"
            placeholderTextColor={colors.gray}
          />
          {errors.address ? <Text style={styles.errorText}>{errors.address}</Text> : null}

          <Text style={styles.label}>Ciudad *</Text>
          <TextInput
            style={[styles.input, errors.city && styles.inputError]}
            value={form.city}
            onChangeText={(v) => updateForm('city', v)}
            placeholder="Ciudad"
            placeholderTextColor={colors.gray}
          />
          {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}

          <Text style={styles.label}>Departamento</Text>
          <TextInput
            style={styles.input}
            value={form.state}
            onChangeText={(v) => updateForm('state', v)}
            placeholder="Opcional"
            placeholderTextColor={colors.gray}
          />

          <Text style={styles.label}>País</Text>
          <Text style={styles.fixedCountry}>{COUNTRY_LABEL}</Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setSameAsBilling((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, sameAsBilling && styles.checkboxChecked]}>
              {sameAsBilling ? <Text style={styles.checkboxTick}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxLabel}>Usar la misma dirección para facturación</Text>
          </TouchableOpacity>
        </View>

        {/* Sección 4: Método de pago */}
        <Text style={styles.sectionTitle}>Método de Pago</Text>
        <View style={styles.card}>
          <View style={styles.paymentRow}>
            <View style={[styles.radio, styles.radioSelected]} />
            <Text style={styles.paymentLabel}>Transferencia bancaria</Text>
          </View>
          <Text style={styles.paymentNote}>
            Recibirás las instrucciones de pago una vez confirmado tu pedido
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.fixedBottom, { paddingBottom: Math.max(24, insets.bottom) }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <Text style={styles.confirmBtnText}>Creando pedido...</Text>
          ) : (
            <Text style={styles.confirmBtnText}>Confirmar Pedido — {totalFormatted}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    color: colors.darkGray,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 12,
  },
  expandIcon: {
    fontSize: 14,
    color: colors.gray,
  },
  summaryCard: {
    backgroundColor: colors.lightGray,
    borderRadius: theme.borderRadius.card,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  summaryThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  summaryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  summaryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  summaryQty: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.gray,
    marginVertical: 12,
    opacity: 0.5,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLineLabel: {
    fontSize: 14,
    color: colors.darkGray,
  },
  summaryLineValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  summaryDiscountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  summaryLineValueMuted: {
    fontSize: 14,
    color: colors.gray,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: theme.borderRadius.card,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  label: {
    fontSize: 14,
    color: colors.darkGray,
    marginBottom: 6,
    marginTop: 10,
  },
  labelFirst: {
    marginTop: 0,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: theme.borderRadius.input,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.secondary,
  },
  inputError: {
    borderColor: colors.primary,
  },
  errorText: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
    marginBottom: 4,
  },
  fixedCountry: {
    fontSize: 16,
    color: colors.darkGray,
    paddingVertical: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: theme.borderRadius.button,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxTick: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.darkGray,
    flex: 1,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gray,
    marginRight: 10,
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  paymentLabel: {
    fontSize: 16,
    color: colors.secondary,
    fontWeight: '600',
  },
  paymentNote: {
    fontSize: 13,
    color: colors.gray,
    marginTop: 10,
    lineHeight: 18,
  },
  fixedBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: colors.background,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.button,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },
  confirmBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: theme.borderRadius.button,
    marginTop: 16,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 48,
    color: colors.white,
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.darkGray,
    marginBottom: 8,
    textAlign: 'center',
  },
  successNote: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
  },
});
