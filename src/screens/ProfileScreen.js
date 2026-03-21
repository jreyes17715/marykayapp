import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { calcularDescuentoUsuario } from '../utils/discounts';
import { necesitaReactivacion, diasDesdeUltimaCompra } from '../utils/cartValidation';
import colors from '../constants/colors';
import theme from '../constants/theme';
import { Feather } from '@expo/vector-icons';

const AVATAR_BG = '#d11e51';
const ORO_ACTIVO = '#FFD700';
const KIT_COMPRADO = '#4CAF50';
const KIT_PENDIENTE = '#FF5722';
const REACTIVACION = '#FF9800';
const INACTIVO = '#9E9E9E';

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatVigencia(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function diasRestantes(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d - now) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}

function MenuRow({ iconName, label, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <Feather
        name={iconName}
        size={20}
        color={danger ? colors.primary : colors.secondary}
        style={styles.menuIcon}
      />
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, isLoggedIn, logout } = useAuth();
  const [addressModalVisible, setAddressModalVisible] = useState(false);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás segura de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
      ]
    );
  }, [logout]);

  const showComingSoon = useCallback((title) => {
    Alert.alert(title, 'Próximamente');
  }, []);

  const nivelInfo = useMemo(() => calcularDescuentoUsuario(user), [user]);
  const reactivation = useMemo(() => necesitaReactivacion(user), [user]);
  const diasUltimaCompra = useMemo(() => {
    const d = diasDesdeUltimaCompra(user);
    return d === Infinity ? null : Math.floor(d);
  }, [user]);

  const vigenciaFormatted = user?.vigencia50 ? formatVigencia(user.vigencia50) : null;
  const vigenciaDiasRest = user?.vigencia50 ? diasRestantes(user.vigencia50) : null;

  const nivelBorderColor = nivelInfo.nivel.includes('ORO') ? ORO_ACTIVO : INACTIVO;

  if (!isLoggedIn) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Inicia sesión para ver tu perfil</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName =
    user?.displayName ||
    (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}`.trim() : '') ||
    user?.email ||
    'Usuario';
  const initials = getInitials(displayName);
  const billing = user?.billing || {};
  const phone = billing.phone || user?.billing?.phone || '';

  const billingLines = [
    billing.address_1,
    [billing.city, billing.state].filter(Boolean).join(', '),
    billing.country,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Sección 1: Info del Usuario */}
      <View style={styles.header}>
        <View style={[styles.avatarWrap, { backgroundColor: AVATAR_BG }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
        {phone ? <Text style={styles.userPhone}>{phone}</Text> : null}
      </View>

      {/* Sección 2: Mi Nivel de Descuento */}
      <View style={[styles.card, styles.cardNivel, { borderLeftColor: nivelBorderColor }]}>
        <Text style={styles.cardTitle}>Mi Nivel de Descuento</Text>
        <View style={styles.nivelRow}>
          <Text style={styles.nivelIcon}>🥇</Text>
          <Text style={styles.nivelTexto}>{nivelInfo.nivel}</Text>
        </View>
        <Text style={styles.nivelMotivo}>{nivelInfo.motivo}</Text>
        {vigenciaFormatted && vigenciaDiasRest != null && (
          <View style={styles.vigenciaWrap}>
            <Text style={styles.vigenciaText}>Vigente hasta: {vigenciaFormatted}</Text>
            <Text style={styles.vigenciaDias}>{vigenciaDiasRest} días restantes</Text>
          </View>
        )}
      </View>

      {/* Sección 3: Estado de Compra */}
      <View
        style={[
          styles.card,
          styles.cardEstado,
          {
            borderLeftColor: user?.hasBoughtKit
              ? reactivation
                ? REACTIVACION
                : KIT_COMPRADO
              : KIT_PENDIENTE,
          },
        ]}
      >
        <Text style={styles.cardTitle}>Estado de Compra</Text>
        {user?.hasBoughtKit ? (
          <>
            <Text style={styles.estadoLine}>✅ Kit Inicial: Comprado</Text>
            <Text style={styles.estadoSub}>Compra mínima: RD$ 10,000 por pedido</Text>
            {reactivation && (
              <Text style={[styles.estadoLine, { color: REACTIVACION }]}>
                ⚠️ Reactivación requerida: mínimo RD$ 20,000
              </Text>
            )}
            {diasUltimaCompra != null && (
              <Text style={styles.estadoSub}>
                Última compra hace {diasUltimaCompra} {diasUltimaCompra === 1 ? 'día' : 'días'}
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.estadoLine}>❌ Kit Inicial: Pendiente</Text>
            <Text style={styles.estadoSub}>
              Tu primera compra debe incluir el Kit Inicial + mínimo RD$ 25,000
            </Text>
            <TouchableOpacity
              style={styles.kitButton}
              onPress={() => navigation.navigate('Tienda')}
              activeOpacity={0.8}
            >
              <Text style={styles.kitButtonText}>Comprar Kit Inicial →</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Sección 4: Menú */}
      <View style={styles.separator} />
      <MenuRow
        iconName="package"
        label="Mis Pedidos"
        onPress={() => navigation.navigate('Orders')}
      />
      <MenuRow
        iconName="map-pin"
        label="Mi Dirección"
        onPress={() => setAddressModalVisible(true)}
      />
      <MenuRow
        iconName="settings"
        label="Configuración"
        onPress={() => showComingSoon('Configuración')}
      />
      <View style={styles.separator} />
      <MenuRow
        iconName="log-out"
        label="Cerrar Sesión"
        onPress={handleLogout}
        danger
      />

      {/* Modal Mi Dirección */}
      <Modal
        visible={addressModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddressModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalCard}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Mi Dirección</Text>
            {billingLines ? (
              <Text style={styles.modalAddress}>{billingLines}</Text>
            ) : (
              <Text style={styles.modalEmpty}>No hay dirección registrada</Text>
            )}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setAddressModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    fontSize: 18,
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: theme.borderRadius.button,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
    color: colors.gray,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: colors.darkGray,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: theme.borderRadius.card,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    ...theme.shadow,
  },
  cardNivel: {},
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nivelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  nivelIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  nivelTexto: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  nivelMotivo: {
    fontSize: 14,
    color: colors.darkGray,
    marginBottom: 4,
  },
  vigenciaWrap: {
    marginTop: 6,
  },
  vigenciaText: {
    fontSize: 13,
    color: colors.gray,
  },
  vigenciaDias: {
    fontSize: 13,
    color: colors.gray,
    marginTop: 2,
  },
  cardEstado: {},
  estadoLine: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 4,
  },
  estadoSub: {
    fontSize: 14,
    color: colors.darkGray,
    marginBottom: 4,
  },
  kitButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: KIT_PENDIENTE,
    borderRadius: theme.borderRadius.button,
  },
  kitButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: colors.lightGray,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.secondary,
  },
  menuLabelDanger: {
    color: colors.primary,
    fontWeight: '600',
  },
  menuArrow: {
    fontSize: 22,
    color: colors.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: theme.borderRadius.card,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 12,
  },
  modalAddress: {
    fontSize: 15,
    color: colors.darkGray,
    lineHeight: 22,
    marginBottom: 16,
  },
  modalEmpty: {
    fontSize: 15,
    color: colors.gray,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  modalCloseBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.button,
    alignItems: 'center',
  },
  modalCloseText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
