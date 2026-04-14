import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const SUPPORT_EMAIL = 'soporte@aromadelrosal.com';

export default function BlockedScreen() {
  const { logout } = useAuth();

  function handleContactarSoporte() {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {
      Alert.alert('Correo de soporte', SUPPORT_EMAIL);
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Feather name="alert-circle" size={48} color="#ffffff" />
        </View>

        <Text style={styles.title}>Cuenta Inhabilitada</Text>

        <Text style={styles.message}>
          Tu cuenta ha sido inhabilitada. Para mas informacion, contacta a soporte tecnico:
        </Text>

        <Text style={styles.email}>{SUPPORT_EMAIL}</Text>

        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={handleContactarSoporte}
          activeOpacity={0.8}
        >
          <Feather name="mail" size={18} color="#ffffff" style={styles.btnIcon} />
          <Text style={styles.buttonPrimaryText}>Contactar Soporte</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonGhost}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonGhostText}>Cerrar Sesion</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#d11e51',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d11e51',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d11e51',
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonPrimary: {
    backgroundColor: '#d11e51',
    borderRadius: 10,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  btnIcon: {
    marginRight: 8,
  },
  buttonPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGhost: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  buttonGhostText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
});
