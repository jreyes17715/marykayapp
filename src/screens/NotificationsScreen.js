import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import colors from '../constants/colors';
import theme from '../constants/theme';
import { Feather } from '@expo/vector-icons';

const INITIAL_NOTIFICATIONS = [
  {
    id: '1',
    title: '¡Bienvenida a la App! 🎉',
    message:
      'Estamos felices de que estés aquí. Explora nuestro catálogo de productos Mary Kay.',
    date: '2026-03-12',
    read: false,
    type: 'welcome',
  },
  {
    id: '2',
    title: 'Nuevos productos disponibles 💄',
    message:
      'Hemos agregado nuevos productos al catálogo. ¡No te los pierdas!',
    date: '2026-03-11',
    read: false,
    type: 'product',
  },
  {
    id: '3',
    title: 'Recuerda tu meta mensual 📊',
    message:
      'Llevas buen progreso este mes. ¡Sigue así para mantener tu nivel ORO!',
    date: '2026-03-10',
    read: true,
    type: 'goal',
  },
  {
    id: '4',
    title: 'Promoción especial de Marzo 🌸',
    message:
      'Aprovecha los descuentos especiales en productos seleccionados durante todo marzo.',
    date: '2026-03-08',
    read: true,
    type: 'promo',
  },
  {
    id: '5',
    title: 'Tu pedido #1234 fue confirmado ✅',
    message:
      'Tu pedido ha sido recibido y está siendo procesado. Te notificaremos cuando esté listo.',
    date: '2026-03-05',
    read: true,
    type: 'order',
  },
];

function fechaRelativa(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  return date.toLocaleDateString('es-GT');
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              read: true,
            }
          : n
      )
    );
  };

  const renderItem = ({ item }) => {
    const containerStyle = [
      styles.card,
      !item.read && styles.cardUnread,
    ];
    return (
      <TouchableOpacity
        style={containerStyle}
        activeOpacity={0.8}
        onPress={() => {
          if (!item.read) toggleRead(item.id);
        }}
      >
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.cardDate}>{fechaRelativa(item.date)}</Text>
      </TouchableOpacity>
    );
  };

  const keyExtractor = (item) => item.id;

  if (notifications.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="bell" size={60} color={colors.primary} style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>No tienes notificaciones</Text>
        <Text style={styles.emptySubtitle}>
          Te avisaremos cuando haya algo nuevo para ti.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllAsRead}
            activeOpacity={0.8}
          >
            <Text style={styles.markAllText}>Marcar todas como leídas</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGray,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  markAllText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: theme.borderRadius.card,
    padding: 14,
    marginBottom: 10,
    ...theme.shadow,
  },
  cardUnread: {
    backgroundColor: '#FFF0F3',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 4,
  },
  cardMessage: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 12,
    color: colors.darkGray,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.lightGray,
  },
  emptyIcon: {
    fontSize: 60,
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
  },
});
