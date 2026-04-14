import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getOrdersByCustomer } from '../api/woocommerce';
import { formatPrice } from '../utils/helpers';
import colors from '../constants/colors';
import theme from '../constants/theme';

function formatOrderDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function mapStatus(status) {
  switch (status) {
    case 'pending':
      return { label: 'Pendiente de pago', color: '#FFC107' };
    case 'processing':
      return { label: 'Procesando', color: '#2196F3' };
    case 'on-hold':
      return { label: 'En espera', color: '#FF9800' };
    case 'completed':
      return { label: 'Completado', color: '#4CAF50' };
    case 'cancelled':
      return { label: 'Cancelado', color: '#F44336' };
    case 'refunded':
      return { label: 'Reembolsado', color: '#9E9E9E' };
    case 'failed':
      return { label: 'Fallido', color: '#F44336' };
    default:
      return { label: status || 'Desconocido', color: '#9E9E9E' };
  }
}

export default function OrdersScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    // FIX: order-leak-customer-0 — if customerId is 0 or absent the user has no
    // WooCommerce customer record yet. Calling the API with id=0 returns all
    // store orders. Show empty state instead.
    // Was: customerId ?? 0 passed unconditionally → Now: guard blocks id <= 0
    const customerId = user?.customerId;
    if (!customerId || customerId <= 0) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const res = await getOrdersByCustomer(customerId);
    if (res.success && Array.isArray(res.data)) {
      setOrders(res.data);
    } else {
      setError(res.error || 'No se pudieron cargar tus pedidos.');
      setOrders([]);
    }
    setLoading(false);
  }, [user?.customerId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, [loadOrders]);

  const renderItem = useCallback(({ item }) => {
    const statusInfo = mapStatus(item.status);
    const total = formatPrice(item.total);
    const productsCount = Array.isArray(item.line_items)
      ? item.line_items.length
      : 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>Pedido #{item.id}</Text>
        </View>
        <Text style={styles.orderDate}>{formatOrderDate(item.date_created)}</Text>
        <View style={styles.cardBodyRow}>
          <Text style={styles.cardBodyText}>
            {productsCount} {productsCount === 1 ? 'producto' : 'productos'} · {total}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            Estado: {statusInfo.label}
          </Text>
          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() => navigation.navigate('OrderTracking', { order: item })}
            activeOpacity={0.8}
            accessibilityLabel={`Orden #${item.id}`}
          >
            <Text style={styles.detailsText}>Ver →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [navigation]);

  const keyExtractor = (item) => String(item.id);

  if (loading && orders.length === 0 && !error) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando pedidos...</Text>
      </View>
    );
  }

  if (!loading && orders.length === 0 && !error) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📦</Text>
        <Text style={styles.emptyTitle}>Aún no tienes pedidos</Text>
        <Text style={styles.emptySubtitle}>
          Cuando hagas tu primera compra, verás tus pedidos aquí.
        </Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => navigation.navigate('Tienda')}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyBtnText}>Ir a la tienda</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadOrders}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <FlatList
        data={orders}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGray,
    padding: 16,
  },
  listContent: {
    paddingBottom: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: theme.borderRadius.card,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  orderDate: {
    fontSize: 13,
    color: colors.gray,
    marginBottom: 8,
  },
  cardBodyRow: {
    marginBottom: 8,
  },
  cardBodyText: {
    fontSize: 14,
    color: colors.darkGray,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  detailsText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.lightGray,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.gray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.lightGray,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.button,
  },
  emptyBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#B71C1C',
    marginBottom: 4,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  retryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
