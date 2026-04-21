import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatPrice } from '../api/woocommerce';
import colors from '../constants/colors';
import theme from '../constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Resumen de pedido.
 *
 * Props nuevas (opcionales, opt-in):
 *  - collapsible: boolean           -> habilita modo plegable
 *  - collapsed: boolean             -> estado controlado (opcional)
 *  - onToggleCollapsed: () => void  -> callback al togglear (opcional)
 *  - defaultCollapsed: boolean      -> estado inicial si no es controlado
 */
export default function OrderSummaryCard({
  subtotalOriginal,
  totalConDescuento,
  discountNivel,
  discountEspeciales,
  totalNetos,
  shipping,
  shippingCost,
  totalItems,
  showFreeShippingHint = false,
  collapsible = false,
  collapsed,
  onToggleCollapsed,
  defaultCollapsed = false,
}) {
  const [internalCollapsed, setInternalCollapsed] = React.useState(defaultCollapsed);
  const isControlled = typeof collapsed === 'boolean';
  const isCollapsed = collapsible && (isControlled ? collapsed : internalCollapsed);

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isControlled) {
      onToggleCollapsed?.();
    } else {
      setInternalCollapsed((v) => !v);
      onToggleCollapsed?.();
    }
  };

  const totalDescuentoNivel = discountNivel?.monto || 0;
  const totalDescuentoEspeciales = (discountEspeciales || []).reduce(
    (sum, d) => sum + d.monto,
    0
  );
  const totalDescuento = totalDescuentoNivel + totalDescuentoEspeciales;

  const totalOriginalConDescuento = subtotalOriginal - totalNetos;
  const totalNetoAlPorMayor = totalConDescuento - totalNetos;

  const hasSeccion1 = totalOriginalConDescuento > 0 && totalDescuento > 0;
  const nivelPct = discountNivel?.porcentaje
    || (totalOriginalConDescuento > 0
      ? Math.round((totalDescuento / totalOriginalConDescuento) * 100)
      : 0);

  const totalFinal = totalConDescuento + shippingCost;

  const Wrapper = collapsible ? TouchableOpacity : View;
  const wrapperProps = collapsible
    ? { activeOpacity: 0.85, onPress: handleToggle }
    : {};

  if (collapsible && isCollapsed) {
    return (
      <Wrapper style={styles.card} {...wrapperProps}>
        <View style={styles.collapsedHeader}>
          <View style={styles.collapsedTextWrap}>
            <Text style={styles.collapsedLabel}>Total a Pagar</Text>
            {totalItems > 0 && (
              <Text style={styles.collapsedItems}>
                {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
              </Text>
            )}
          </View>
          <View style={styles.collapsedRight}>
            <Text style={styles.collapsedTotal}>
              {formatPrice(totalFinal.toFixed(2))}
            </Text>
            <View style={styles.seeMoreRow}>
              <Text style={styles.seeMoreText}>Ver más</Text>
              <Feather name="chevron-down" size={14} color={colors.primary} />
            </View>
          </View>
        </View>
      </Wrapper>
    );
  }

  return (
    <Wrapper style={styles.card} {...wrapperProps}>
      {hasSeccion1 && (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>
              Total Productos Sección 1, Nivel ({nivelPct}%)
            </Text>
            <Text style={styles.value}>
              {formatPrice(totalOriginalConDescuento.toFixed(2))}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.discountLabel}>
              Descuento Sección 1, Nivel ({nivelPct}%)
            </Text>
            <Text style={styles.discountValue}>
              -{formatPrice(totalDescuento.toFixed(2))}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.boldLabel}>
              Suma Total Sección 1 - Total Neto al Por Mayor
            </Text>
            <Text style={styles.boldValue}>
              {formatPrice(totalNetoAlPorMayor.toFixed(2))}
            </Text>
          </View>
        </>
      )}

      {totalNetos > 0 && (
        <View style={styles.row}>
          <Text style={styles.seccion2Label}>
            Productos Sección 2 (sin descuento)
          </Text>
          <Text style={styles.seccion2Value}>
            {formatPrice(totalNetos.toFixed(2))}
          </Text>
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.label}>Envío</Text>
        {shipping.isFree ? (
          <Text style={styles.shippingFree}>Gratis</Text>
        ) : shipping.label === 'Por calcular' ? (
          <Text style={styles.shippingMuted}>Por calcular</Text>
        ) : (
          <Text style={styles.value}>Precio envío: {shipping.label}</Text>
        )}
      </View>
      {showFreeShippingHint && !shipping.isFree && (
        <Text style={styles.shippingHint}>
          Envio gratis en compras +RD$60,000
        </Text>
      )}

      <View style={styles.separator} />

      <View style={styles.row}>
        <Text style={styles.totalLabel}>
          Total Final a Pagar - Suma Sección 1 y 2 + Envío
        </Text>
        <Text style={styles.totalValue}>
          {formatPrice(totalFinal.toFixed(2))}
        </Text>
      </View>

      {totalItems > 0 && (
        <Text style={styles.itemCount}>
          {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
        </Text>
      )}

      {collapsible && (
        <View style={styles.seeMoreRowCentered}>
          <Text style={styles.seeMoreText}>Ver menos</Text>
          <Feather name="chevron-up" size={14} color={colors.primary} />
        </View>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.lightGray,
    borderRadius: theme.borderRadius.card,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: colors.darkGray,
    flex: 1,
    marginRight: 8,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  discountLabel: {
    fontSize: 14,
    color: colors.success,
    flex: 1,
    marginRight: 8,
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D32F2F',
  },
  boldLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.secondary,
    flex: 1,
    marginRight: 8,
  },
  boldValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  seccion2Label: {
    fontSize: 14,
    color: colors.success,
    flex: 1,
    marginRight: 8,
  },
  seccion2Value: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  shippingFree: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  shippingMuted: {
    fontSize: 14,
    color: colors.gray,
  },
  shippingHint: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 6,
    marginTop: -4,
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
    flex: 1,
    marginRight: 8,
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
  collapsedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsedTextWrap: {
    flex: 1,
  },
  collapsedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  collapsedItems: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  collapsedRight: {
    alignItems: 'flex-end',
  },
  collapsedTotal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
  },
  seeMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  seeMoreRowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  seeMoreText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginRight: 2,
  },
});
