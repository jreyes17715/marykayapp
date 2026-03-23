import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { formatPrice } from '../utils/helpers';
import { getOrderById, updateOrder } from '../api/woocommerce';
import colors from '../constants/colors';
import theme from '../constants/theme';

const STATUS_CONFIG = {
  'pending': { label: 'Pendiente', color: '#f59e0b', icon: '⏳', description: 'Tu pedido está pendiente de confirmación' },
  'on-hold': { label: 'En espera', color: '#f59e0b', icon: '⏸', description: 'Tu pedido está en espera de verificación de pago' },
  'processing': { label: 'En proceso', color: '#3b82f6', icon: '⚙', description: 'Estamos preparando tu pedido' },
  'completed': { label: 'Completado', color: '#10b981', icon: '✓', description: 'Tu pedido ha sido entregado exitosamente' },
  'cancelled': { label: 'Cancelado', color: '#ef4444', icon: '✕', description: 'Este pedido fue cancelado' },
  'refunded': { label: 'Reembolsado', color: '#8b5cf6', icon: '↩', description: 'Este pedido fue reembolsado' },
  'failed': { label: 'Fallido', color: '#ef4444', icon: '!', description: 'El pago de este pedido falló' },
};

const STATUS_FLOW = ['pending', 'on-hold', 'processing', 'completed'];

function getStatusConfig(status) {
  return STATUS_CONFIG[status] || { label: status, color: colors.gray, icon: '?', description: '' };
}

function fechaLarga(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusTimeline({ currentStatus }) {
  const currentIdx = STATUS_FLOW.indexOf(currentStatus);
  const isFinalNegative = currentStatus === 'cancelled' || currentStatus === 'failed' || currentStatus === 'refunded';

  if (isFinalNegative) {
    const cfg = getStatusConfig(currentStatus);
    return (
      <View style={styles.statusBanner}>
        <View style={[styles.statusBannerIcon, { backgroundColor: cfg.color }]}>
          <Text style={styles.statusBannerIconText}>{cfg.icon}</Text>
        </View>
        <Text style={[styles.statusBannerLabel, { color: cfg.color }]}>{cfg.label}</Text>
        <Text style={styles.statusBannerDesc}>{cfg.description}</Text>
      </View>
    );
  }

  return (
    <View style={styles.timelineContainer}>
      {STATUS_FLOW.map((status, index) => {
        const cfg = getStatusConfig(status);
        const isCompleted = currentIdx >= 0 && index < currentIdx;
        const isCurrent = index === currentIdx;
        const isLast = index === STATUS_FLOW.length - 1;

        return (
          <View key={status} style={styles.timelineRow}>
            <View style={styles.timelineIconCol}>
              <View style={[
                styles.timelineCircle,
                (isCompleted || isCurrent) && { backgroundColor: cfg.color },
              ]}>
                {isCompleted ? (
                  <Text style={styles.timelineCheck}>✓</Text>
                ) : isCurrent ? (
                  <View style={styles.timelineDotActive} />
                ) : (
                  <View style={styles.timelineDotMuted} />
                )}
              </View>
              {!isLast && (
                <View style={[
                  styles.timelineLine,
                  isCompleted && { backgroundColor: cfg.color },
                ]} />
              )}
            </View>
            <View style={styles.timelineTextCol}>
              <Text style={[
                styles.timelineLabel,
                !(isCompleted || isCurrent) && styles.timelineLabelMuted,
              ]}>
                {cfg.label}
              </Text>
              <Text style={[
                styles.timelineDesc,
                !(isCompleted || isCurrent) && styles.timelineDescMuted,
              ]}>
                {cfg.description}
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
  const [order, setOrder] = useState(route.params?.order);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!order?.id) return;
    setRefreshing(true);
    const res = await getOrderById(order.id);
    if (res.success && res.data) {
      setOrder(res.data);
    }
    setRefreshing(false);
  }, [order?.id]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancelar pedido',
      '¿Estás segura de que deseas cancelar este pedido? Esta acción no se puede deshacer.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            const res = await updateOrder(order.id, { status: 'cancelled' });
            setCancelling(false);
            if (res.success && res.data) {
              setOrder(res.data);
              Alert.alert('Pedido cancelado', 'Tu pedido ha sido cancelado exitosamente.');
            } else {
              Alert.alert('Error', res.error || 'No se pudo cancelar el pedido. Intenta de nuevo.');
            }
          },
        },
      ]
    );
  }, [order?.id]);

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

  const shippingTotal = parseFloat(order?.shipping_total || 0);
  const total = parseFloat(order?.total || 0);
  const canCancel = order?.status === 'pending' || order?.status === 'on-hold';
  const statusCfg = getStatusConfig(order?.status);

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se pudo cargar el pedido.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Pedido #{order.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>
        <Text style={styles.date}>{fechaLarga(order.date_created)}</Text>
        <Text style={styles.totalHeader}>{formatPrice(total)}</Text>
      </View>

      <StatusTimeline currentStatus={order.status} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Productos</Text>
        {order.line_items?.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
            </View>
            <Text style={styles.itemSubtotal}>{formatPrice(item.total)}</Text>
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
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              -{formatPrice(Math.abs(discountTotal))}
            </Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Envío</Text>
          <Text style={styles.summaryValue}>
            {shippingTotal > 0 ? formatPrice(shippingTotal) : 'Gratis'}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryTotalLabel}>Total</Text>
          <Text style={styles.summaryTotalValue}>{formatPrice(total)}</Text>
        </View>
      </View>

      {canCancel && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancel}
          disabled={cancelling}
          activeOpacity={0.8}
        >
          {cancelling ? (
            <ActivityIndicator color="#ef4444" size="small" />
          ) : (
            <Text style={styles.cancelBtnText}>Cancelar Pedido</Text>
          )}
        </TouchableOpacity>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 16, color: colors.darkGray },
  header: { marginBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.secondary },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 13, fontWeight: '600' },
  date: { fontSize: 14, color: colors.gray, marginBottom: 4 },
  totalHeader: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  statusBanner: { alignItems: 'center', paddingVertical: 24, marginBottom: 8 },
  statusBannerIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statusBannerIconText: { fontSize: 28, color: '#FFF', fontWeight: 'bold' },
  statusBannerLabel: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  statusBannerDesc: { fontSize: 14, color: colors.gray, textAlign: 'center' },
  timelineContainer: { paddingHorizontal: 8, paddingVertical: 16 },
  timelineRow: { flexDirection: 'row' },
  timelineIconCol: { alignItems: 'center', width: 40 },
  timelineCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  timelineCheck: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  timelineDotActive: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFF' },
  timelineDotMuted: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#CCC' },
  timelineLine: { width: 3, height: 50, backgroundColor: '#E0E0E0' },
  timelineTextCol: { flex: 1, paddingLeft: 12, paddingBottom: 30 },
  timelineLabel: { fontSize: 16, fontWeight: 'bold', color: colors.secondary },
  timelineLabelMuted: { color: colors.gray },
  timelineDesc: { fontSize: 13, color: colors.darkGray, marginTop: 2 },
  timelineDescMuted: { color: '#BBB' },
  section: { backgroundColor: colors.white, borderRadius: theme.borderRadius.card, padding: 14, marginTop: 12, ...theme.shadow },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.secondary, marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemInfo: { flex: 1, marginRight: 8 },
  itemName: { fontSize: 14, color: colors.secondary },
  itemQty: { fontSize: 13, color: colors.gray },
  itemSubtotal: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  summaryLabel: { fontSize: 14, color: colors.darkGray },
  summaryValue: { fontSize: 14, color: colors.secondary, fontWeight: '600' },
  summaryDivider: { height: 1, backgroundColor: colors.lightGray, marginVertical: 8 },
  summaryTotalLabel: { fontSize: 16, fontWeight: 'bold', color: colors.secondary },
  summaryTotalValue: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.button,
    borderWidth: 2,
    borderColor: '#ef4444',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: '#ef4444' },
});
