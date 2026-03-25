import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatPrice } from '../api/woocommerce';
import colors from '../constants/colors';
import theme from '../constants/theme';

/**
 * Resumen de pedido agrupado en secciones:
 *  - Sección 1: Productos con descuento (total original, descuento, neto al por mayor)
 *  - Sección 2: Productos sin descuento (precio neto)
 *  - Envío
 *  - Total final
 *
 * Props:
 *  - subtotalOriginal: number
 *  - totalConDescuento: number
 *  - discountNivel: { porcentaje, monto } | null
 *  - discountEspeciales: [{ porcentaje, monto }]
 *  - totalNetos: number
 *  - shipping: { cost, isFree, label }
 *  - shippingCost: number
 *  - totalItems: number
 *  - showFreeShippingHint: boolean (optional)
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
}) {
  const totalDescuentoNivel = discountNivel?.monto || 0;
  const totalDescuentoEspeciales = (discountEspeciales || []).reduce(
    (sum, d) => sum + d.monto,
    0
  );
  const totalDescuento = totalDescuentoNivel + totalDescuentoEspeciales;

  // Sección 1: productos CON descuento
  const totalOriginalConDescuento = subtotalOriginal - totalNetos;
  const totalNetoAlPorMayor = totalConDescuento - totalNetos;

  // Porcentaje para el label
  const hasSeccion1 = totalOriginalConDescuento > 0 && totalDescuento > 0;
  const nivelPct = discountNivel?.porcentaje
    || (totalOriginalConDescuento > 0
      ? Math.round((totalDescuento / totalOriginalConDescuento) * 100)
      : 0);

  // Total final
  const totalFinal = totalConDescuento + shippingCost;

  return (
    <View style={styles.card}>
      {/* Sección 1: Productos con descuento */}
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

      {/* Sección 2: Productos sin descuento */}
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

      {/* Envío */}
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

      {/* Separador */}
      <View style={styles.separator} />

      {/* Total Final */}
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
    </View>
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
});
