import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { formatPrice } from '../utils/helpers';
import colors from '../constants/colors';
import theme from '../constants/theme';

const TRACKING_STEPS = [
  { id: 'approved', label: 'Aprobado', description: 'Tu pedido ha sido aprobado' },
  { id: 'packing', label: 'Empaquetando', description: 'Estamos preparando tu pedido' },
  { id: 'in_transit', label: 'En ruta', description: 'Tu pedido va en camino' },
  { id: 'delivered', label: 'Entregado', description: 'Pedido entregado exitosamente' },
];

function getCurrentStep(status) {
  switch (status) {
    case 'pending':
    case 'on-hold':
      return 0;
    case 'processing':
      return 1;
    case 'completed':
      return 4;
    case 'cancelled':
    case 'failed':
      return -1;
    default:
      return 1;
  }
}

function fechaLarga(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function TrackingTimeline({ currentStep }) {
  return (
    <View style={styles.timelineContainer}>
      {TRACKING_STEPS.map((step, index) => {
        const isCompleted = currentStep > 0 && index < currentStep;
        const isCurrent = currentStep > 0 && index === currentStep - 1;
        const isLast = index === TRACKING_STEPS.length - 1;

        return (
          <View key={step.id} style={styles.timelineRow}>
            <View style={styles.timelineIconCol}>
              <View
                style={[
                  styles.timelineCircle,
                  (isCompleted || isCurrent) && styles.timelineCircleActive,
                ]}
              >
                {isCompleted ? (
                  <Text style={styles.timelineCheck}>✓</Text>
                ) : isCurrent ? (
                  <View style={styles.timelineDot} />
                ) : (
                  <View style={[styles.timelineDot, styles.timelineDotMuted]} />
                )}
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.timelineLine,
                    isCompleted && styles.timelineLineActive,
                  ]}
                />
              )}
            </View>
            <View style={styles.timelineTextCol}>
              <Text
                style={[
                  styles.timelineLabel,
                  !(isCompleted || isCurrent) && styles.timelineLabelMuted,
                ]}
              >
                {step.label}
              </Text>
              <Text
                style={[
                  styles.timelineDesc,
                  !(isCompleted || isCurrent) && styles.timelineDescMuted,
                ]}
              >
                {step.description}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function OrderTrackingScreen() {
  const route = useRoute();
  const order = route.params?.order;

  const currentStep = useMemo(
    () => getCurrentStep(order?.status),
    [order?.status]
  );

  const subtotal = useMemo(() => {
    if (!order?.line_items) return 0;
    return order.line_items.reduce(
      (sum, item) => sum + parseFloat(item.total || 0),
      0
    );
  }, [order?.line_items]);

  const discountTotal = useMemo(() => {
    if (!order?.fee_lines) return 0;
    return order.fee_lines.reduce((sum, fee) => {
      const val = parseFloat(fee.total || 0);
      return val < 0 ? sum + val : sum;
    }, 0);
  }, [order?.fee_lines]);

  const shipping = parseFloat(order?.shipping_total || 0);
  const total = parseFloat(order?.total || 0);

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se pudo cargar el pedido.</Text>
      </View>
    );
  }

  const isCancelled =
    order.status === 'cancelled' || order.status === 'failed';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Pedido #{order.id}</Text>
        <Text style={styles.date}>{fechaLarga(order.date_created)}</Text>
        <Text style={styles.total}>{formatPrice(total)}</Text>
      </View>

      {isCancelled && (
        <View style={styles.cancelledBanner}>
          <Text style={styles.cancelledText}>
            Este pedido fue cancelado. El tracking no está disponible.
          </Text>
        </View>
      )}

      {!isCancelled && <TrackingTimeline currentStep={currentStep} />}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Productos</Text>
        {order.line_items?.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
            </View>
            <Text style={styles.itemSubtotal}>
              {formatPrice(item.total)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumen</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
        </View>
        {discountTotal < 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Descuento</Text>
            <Text style={styles.summaryValue}>
              -{formatPrice(Math.abs(discountTotal))}
            </Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Envío</Text>
          <Text style={styles.summaryValue}>{formatPrice(shipping)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryTotalLabel}>Total</Text>
          <Text style={styles.summaryTotalValue}>{formatPrice(total)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: colors.darkGray,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 4,
  },
  total: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  cancelledBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: theme.borderRadius.card,
    padding: 12,
    marginBottom: 12,
  },
  cancelledText: {
    fontSize: 14,
    color: '#B71C1C',
  },
  timelineContainer: {
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineIconCol: {
    alignItems: 'center',
    width: 40,
  },
  timelineCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineCircleActive: {
    backgroundColor: colors.primary,
  },
  timelineCheck: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.white,
  },
  timelineDotMuted: {
    backgroundColor: '#CCCCCC',
  },
  timelineLine: {
    width: 3,
    height: 50,
    backgroundColor: '#E0E0E0',
  },
  timelineLineActive: {
    backgroundColor: colors.primary,
  },
  timelineTextCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 30,
  },
  timelineLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  timelineLabelMuted: {
    color: colors.gray,
  },
  timelineDesc: {
    fontSize: 13,
    color: colors.darkGray,
    marginTop: 2,
  },
  timelineDescMuted: {
    color: '#BBBBBB',
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: theme.borderRadius.card,
    padding: 14,
    marginTop: 12,
    ...theme.shadow,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    color: colors.secondary,
  },
  itemQty: {
    fontSize: 13,
    color: colors.gray,
  },
  itemSubtotal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
  summaryDivider: {
    height: 1,
    backgroundColor: colors.lightGray,
    marginVertical: 8,
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
});
